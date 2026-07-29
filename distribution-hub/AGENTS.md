# Distribution Hub Agent Rules

This repository owns the Distribution Hub web application, API routes,
Cloudflare Worker configuration, and D1 schema.

## Boundaries

- Cloudflare D1 is the operational source of truth for publishing state.
- Production pipelines are external API clients. Do not copy pipeline state,
  SQLite databases, credentials, or generated media into this repository.
- Notion is not a runtime dependency and must not be reintroduced as a status
  source or synchronization bridge.
- Facebook and Instagram publishing is manual-only. Code may record a member's
  publication receipt, but must not upload or publish social content.

## Development

- Work on a feature branch; do not commit directly to the default branch.
- Run `npm run lint` and `npm test` before committing.
- Never commit `.env` files, tokens, certificates, local D1 state, Wrangler
  state, build output, or `node_modules`.
- Deploy only after the tested commit has been pushed.

