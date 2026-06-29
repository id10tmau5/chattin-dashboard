# Changelog

All notable changes to this project are documented here.

---

## [1.2.0] — 2026-06-29

### Changed
- **Status check cost reduced ~65%** — `check-status.yml` now uses **Claude Haiku 4.5** instead of Sonnet 4.6 (roughly one-third the per-token price for a lookup-and-format task), caps web searches at **2** via `max_uses` (cutting both per-search fees and the input-token bloat from search results re-entering context), and trims `max_tokens` to 700. Typical run cost drops from ~$0.10 to roughly ~$0.03.
- **Concise status notes** — The workflow prompt now requests a single-sentence `notes` field and a domain-only `sourcesChecked` list, with a server-side length clamp as a safety net. The dashboard renders notes in a fixed-height scrollable box and shows the technical sources list to owner mode only.
- **DOC Status Checker layout** — The section title bar now spans full width (the owner-only ⚙ setup control moved down beside the action buttons). The references line (DOC Locator / VINELink / PA VINE) now collapses with the rest of the section instead of staying pinned.
- **Two timestamps** — A user-facing **Last refreshed** time (when *Check for Updates* was last tapped, persisted across reloads) plus an owner-only **Last status check** time showing when the workflow last ran and whether it was automatic or manual.
- **Inmate # / Parole # / SAVIN contact boxes** — Field values now sit to the right of their labels instead of underneath, filling the box width.
- **PDF placement** — Docket Sheet and Court Summary PDF buttons now also appear at the top of the page and in the Official Resources section, in addition to the Charges section.
- **Dark-mode contrast** — Brightened the secondary/dim text colors for readability in dark mode (light mode unchanged).
- **Subject Age Profile** — Timeline labels now read *Optimistic Release / Likely Release / Pessimistic Release* (matching *Max Release*), and the subject's full middle name is shown.
- **By the Numbers** — "Age at Max" relabeled "Age at Max Release" for clarity.
- **Automatic Custody Notifications** — Section renamed from "PA SAVIN — Automatic Custody Notifications"; the VINE phone number is now tap-to-call (`tel:` link).
- **Case Background** — Inserted "allegedly" before the intoxication description (third-hand account, not asserted as fact).

### Fixed
- **Effective Total row (mobile)** — Now stretches to the full table width on mobile, matching desktop, instead of clipping to the viewport.
- **checkedBy labeling** — Scheduled runs now report "GitHub Actions (automatic daily)" vs "GitHub Actions (manual trigger)".

---

## [1.1.0] — 2026-06-28

### Fixed
- **Anthropic API authentication (critical)** — `check-status.yml` was sending the API key via an `Authorization: Bearer <key>` header, which the Anthropic API rejects with `401 authentication_error: Invalid bearer token`. The Anthropic API authenticates with the `x-api-key` header. Switched the header; the daily and manual status checks now authenticate correctly.

### Added
- **Owner mode (hidden developer controls)** — The **Run Status Check** button, **⚙ setup** config panel, and **↻ compile** button are now hidden by default so non-owner viewers see only the status display and **Check for Updates**. Reveal/hide toggles via `Ctrl+Shift+U` (desktop) or 5 rapid taps on the footer source line (mobile). State persists in `localStorage`.
- **Daily scheduled status check** — `check-status.yml` now runs automatically once daily at `07:00 UTC` via cron, in addition to the existing manual trigger.
- **PDF court documents** — Docket numbers throughout the dashboard link to docket sheets and court summaries (16 PDFs across 8 cases). Opens an inline lightbox on desktop; on mobile, renders through Google Docs Viewer so PDFs display in-browser instead of force-downloading.
- **Mugshot lightbox** — Clicking the inmate photo opens a fullscreen view.
- **Dynamic status badge** — The header custody badge updates color and label (🔒 IN CUSTODY / 📋 ON PAROLE / ✅ DISCHARGED) based on the latest check result, with a matching row added to the Inmate Profile.
- **Collapsible sections** — All 14 main sections collapse/expand individually with state saved to `localStorage`. **PA DOC Inmate Profile**, **DOC Status Checker**, and **Sentence Status** start expanded; the rest start collapsed. An **⊞ Expand All / ⊟ Collapse All** control toggles every section at once. The two Parole Board Factor Analysis subsections (Against / In Favor) are independently collapsible, collapsed by default.

### Changed
- **Page title** → `PA DOC Status Dashboard` (generic, no case/name reference).
- **Status Checker copy** — Removed all GitHub/Actions/workflow references from user-facing text. Non-owner viewers see a single-sentence hint and a generic empty-state; owner mode shows full detail.
- **Config field labels** — The two key fields are now clearly distinguished: 🔑 **GitHub Access Token** (triggers checks, stored in-browser) vs 🤖 **Anthropic API Key** (used by the check itself, stored in GitHub Secrets), with an explainer noting they are not interchangeable and format-hinting placeholders (`ghp_…` / `sk-ant-…`).
- **README** — Rewritten for concision; fully reflects owner mode, PDFs, and the current architecture.

---

## [1.0.2] — 2026-06-17

### Fixed
- Removed personal name identifiers from all documentation and source files

### Changed
- **Check for Updates** button now disables and grays out for 45 seconds after **Run Status Check** is triggered, giving the workflow time to complete before a fetch is attempted. A live countdown (`⏳ 44s → ⏳ 1s`) replaces the button label during the wait, then re-enables automatically.
- **Run Status Check** feedback message updated to reflect the new 45-second hold period.

### Added
- Inconspicuous `↻ compile` button in the dashboard footer triggers `build.yml` (recompile JSX → JS) on demand. Useful when the `.jsx` source is edited directly on GitHub (via web editor or file upload) rather than pushed via git, since the `build.yml` path filter only fires on git-pushed changes. Provides `✓ compiled` / `✕ compile failed` feedback inline.

---

## [1.0.1] — 2026-06-17

### Fixed
- **Loading hang on mobile (critical)** — The original `index.html` loaded Babel standalone (~4 MB) and used it to transform 85 KB of JSX in the browser at page load time. On mobile devices this caused a 15–30+ second hang before anything rendered. Additionally, `libsodium-wrappers` was loaded via a CDN URL pointing to a CommonJS/Node.js build, which threw `ReferenceError: module is not defined` and blocked the page from rendering entirely.
- **Architecture pivoted to pre-compiled build:** JSX is now compiled to plain JavaScript by `build.yml` (server-side, Babel in GitHub Actions). The browser receives ready-to-execute JS. Page load time reduced from 15–30+ seconds to ~1–2 seconds on mobile.
- **libsodium removed from browser context** — In-browser GitHub Secret encryption replaced with a direct link to GitHub’s repository secrets settings page.

### Changed
- `index.html` reduced from ~85 KB to 1.7 KB — now a minimal loader only.
- `chattin-case-dashboard.js` added as compiled output (99 KB). Auto-generated by `build.yml`.
- Edit API Key in ⚙ Configure now opens GitHub repository secrets settings in a new tab.

### Added
- `build.yml` GitHub Actions workflow — triggers automatically on push to `chattin-case-dashboard.jsx`, compiles JSX to JS, commits result.

---

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
  - **Run Status Check** — dispatches `check-status.yml` via GitHub API
- In-dashboard ⚙ Configure panel with GitHub PAT storage
- Light / Dark / Auto theme toggle (WCAG AA contrast compliant)
- Fully responsive layout (mobile ↔ desktop)
- All docket links open UJS Portal + copy docket number to clipboard
- Comprehensive Resources section linking all official sources
- `check-status.yml` — manual-trigger-only status check workflow
- Persistent status caching via `localStorage`
