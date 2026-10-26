# GoodMorning MVP Template Agent Instructions

## Branching and pull requests
- `main` is production and must remain deployable.
- `dev` is the integrated development branch.
- Create feature branches from `dev`.
- Open normal pull requests toward `dev`.
- Open release pull requests from `dev` to `main`.
- Do not push directly to `main`.

## Verification and reporting
- Run the relevant checks before reporting work as complete.
- Report every command run and its result.
- Call out any check that could not run and explain the environment limitation.
- Confirm that no real secrets, credentials, tokens, or production identifiers were added.
- Preserve existing user data across application updates. Changes to persistence or migrations must include regression coverage for loading and saving an existing user state, including presets and all 12 mode levels; never reset or drop user data as part of a routine deploy.

## Safety and approvals
- Do not perform destructive operations without explicit approval.
- Do not run production operations, migrations, deploys, rollbacks, or infrastructure changes without explicit approval.
- Do not fabricate infrastructure details, credentials, application IDs, server names, or deployment status.

## Non-negotiable: Holista home map

- Preserve the Holista visual style and keep all 12 home-screen mode cards on one circle around the existing central profile at every screen size. Never replace this map with a grid, list, columns, carousel, or different composition unless the user explicitly revokes this rule.
- Card sizes, radius and angular spacing may be adjusted to fit complete single-line mode labels. Preserve all mode words, the mode order, central profile, colors, icons, meters, interactions and stored data. Localized generic words meaning "Mode" may be omitted from compact card labels, as already done in Spanish and English; retain full accessible names.
- Verify the rendered circle, all 12 visible independent targets, complete single-line labels and lack of overlap at mobile, tablet and desktop widths before completing map changes. Do not treat a passing desktop check as evidence for mobile.
