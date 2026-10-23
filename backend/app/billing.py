import json
from typing import Any

from sqlalchemy import text


class PostgresBillingStore:
    """Small gm-billing store adapter backed by the product PostgreSQL database."""

    def __init__(self, engine):
        self.engine = engine

    def add_usage(self, record) -> None:
        with self.engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO gm_billing_usage
                    (id, product_id, organization_id, user_id, provider, model, input_tokens,
                     output_tokens, cached_tokens, request_id, provider_cost, goodmorning_charge, created_at)
                    VALUES (:id, :product_id, :organization_id, :user_id, :provider, :model,
                            :input_tokens, :output_tokens, :cached_tokens,
                            :request_id, :provider_cost, :goodmorning_charge, :created_at)
                    """
                ),
                {
                    "id": record.id,
                    "product_id": record.product_id,
                    "organization_id": record.organization_id,
                    "user_id": record.user_id,
                    "provider": record.provider,
                    "model": record.model,
                    "input_tokens": record.input_tokens,
                    "output_tokens": record.output_tokens,
                    "cached_tokens": record.cached_tokens,
                    "request_id": record.request_id,
                    "provider_cost": record.provider_cost,
                    "goodmorning_charge": record.goodmorning_charge,
                    "created_at": record.created_at,
                },
            )

    def add_ledger(self, entry) -> None:
        with self.engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO gm_billing_ledger
                    (id, product_id, usage_id, organization_id, user_id, amount,
                     currency, entry_type, created_at)
                    VALUES (:id, :product_id, :usage_id, :organization_id, :user_id,
                            :amount, :currency, :entry_type, :created_at)
                    """
                ),
                {
                    "id": entry.id,
                    "product_id": entry.product_id,
                    "usage_id": entry.usage_id,
                    "organization_id": entry.organization_id,
                    "user_id": entry.user_id,
                    "amount": entry.amount,
                    "currency": entry.currency,
                    "entry_type": entry.entry_type,
                    "created_at": entry.created_at,
                },
            )


class UserStateStore:
    def __init__(self, engine):
        self.engine = engine

    def get(self, user_id: str, organization_id: str) -> dict[str, Any]:
        with self.engine.begin() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT state FROM modocultiva_user_state
                    WHERE user_id = :user_id AND organization_id = :organization_id
                    """
                ),
                {"user_id": user_id, "organization_id": organization_id},
            ).mappings().first()
        return dict(row["state"]) if row and row["state"] else {}

    def save(self, user_id: str, organization_id: str, state: dict[str, Any]) -> None:
        with self.engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO modocultiva_user_state
                    (user_id, organization_id, state, updated_at)
                    VALUES (:user_id, :organization_id, CAST(:state AS jsonb), now())
                    ON CONFLICT (user_id, organization_id)
                    DO UPDATE SET state = EXCLUDED.state, updated_at = now()
                    """
                ),
                {
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "state": json.dumps(state),
                },
            )

    def merge(self, user_id: str, organization_id: str, state: dict[str, Any]) -> None:
        """Merge a device's pre-account state without discarding cloud data."""
        with self.engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO modocultiva_user_state
                    (user_id, organization_id, state, updated_at)
                    VALUES (:user_id, :organization_id, CAST(:state AS jsonb), now())
                    ON CONFLICT (user_id, organization_id)
                    DO UPDATE SET state =
                      jsonb_set(
                        jsonb_set(
                          jsonb_set(
                            jsonb_set(
                              jsonb_set(
                                jsonb_set(
                                  EXCLUDED.state || modocultiva_user_state.state,
                                '{levels}',
                                COALESCE(EXCLUDED.state->'levels', '{}'::jsonb) || COALESCE(modocultiva_user_state.state->'levels', '{}'::jsonb),
                                true
                              ),
                              '{presets}',
                              COALESCE(EXCLUDED.state->'presets', '{}'::jsonb) || COALESCE(modocultiva_user_state.state->'presets', '{}'::jsonb),
                              true
                            ),
                            '{activityDrafts}',
                            COALESCE(EXCLUDED.state->'activityDrafts', '{}'::jsonb) || COALESCE(modocultiva_user_state.state->'activityDrafts', '{}'::jsonb),
                            true
                          ),
                          '{insightRequests}',
                          COALESCE(EXCLUDED.state->'insightRequests', '{}'::jsonb) || COALESCE(modocultiva_user_state.state->'insightRequests', '{}'::jsonb),
                          true
                        ),
                        '{visionImages}',
                        COALESCE(EXCLUDED.state->'visionImages', '{}'::jsonb) || COALESCE(modocultiva_user_state.state->'visionImages', '{}'::jsonb),
                        true
                      ),
                        '{featuredBadges}',
                        (
                          SELECT COALESCE(jsonb_agg(DISTINCT badge), '[]'::jsonb)
                          FROM jsonb_array_elements(
                            COALESCE(modocultiva_user_state.state->'featuredBadges', '[]'::jsonb) ||
                            COALESCE(EXCLUDED.state->'featuredBadges', '[]'::jsonb)
                          ) AS badges(badge)
                        ),
                        true
                      ),
                      updated_at = now()
                    """
                ),
                {
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "state": json.dumps(state),
                },
            )
