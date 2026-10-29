from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from app.community_schema import COMMUNITY_TABLES


def community_storage_ready(engine) -> bool:
    """Read only; never create tables or reveal connections, records or credentials."""
    try:
        existing = set(inspect(engine).get_table_names())
        if not all(table.name in existing for table in COMMUNITY_TABLES):
            return False
        columns = {column["name"] for column in inspect(engine).get_columns("modocultiva_shared_cards")}
        return {"audience", "submission_id"}.issubset(columns)
    except SQLAlchemyError:
        return False
