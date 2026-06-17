# Changelog

All notable changes to this project are documented here.

## [1.0.0] — 2026-06-17

### Added
- Initial release of the Commonwealth v. Chattin case tracking dashboard
- Full case docket summary: CP-54-CR-0000435-2021 (Schuylkill County)
- Sentence status with progress bars (minimum / maximum served)
- PA offense grade scale with OGS explanation and charge breakdown
- Age profile with criminal history timeline (age 18–42)
- Parole Board factor analysis (expandable, weighted)
- Complete prior record table (7 prior cases, 2009–2021)
- PA DOC inmate profile with embedded official mugshot (PE1239, 6/1/2026)
- PA SAVIN / VINELink registration guide with step-by-step instructions
- DOC status checker with two-button architecture:
  - **Check for Updates** — loads `status.json` from GitHub Pages (instant)
  - **Run Status Check** — dispatches GitHub Actions workflow via GitHub API
- In-dashboard ⚙ Configure panel:
  - GitHub PAT storage (localStorage, used for workflow dispatch + secret management)
  - Edit Anthropic API Key (updates GitHub Secret in-browser via libsodium encryption)
- Light / Dark / Auto theme toggle (WCAG AA contrast compliant)
- Fully responsive layout (mobile ↔ desktop)
- All docket links open UJS Portal + copy docket number to clipboard simultaneously
- Comprehensive Resources section with links to all official sources
- GitHub Actions workflow (`check-status.yml`) — manual trigger only, no schedule
- Persistent status caching via `localStorage`
