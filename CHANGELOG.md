# Changelog

All notable changes to this project are documented here.

---

## [1.5.0] — 2026-07-05

### Added
- **Owner-editable section layout (live)** — The `config.json` groundwork from 1.4.0 is now fully wired. The dashboard fetches it on load and lays out all 15 blocks accordingly, and the **🎛 Section Layout** panel (Setup) lets the owner:
  - Reorder any section via a per-row **order dropdown** that auto-reindexes the rest (always a clean 1–15, no duplicates or gaps).
  - Show/hide each section **per viewer** with independent **User** and **Owner** checkboxes.
  - Choose **desktop columns** (1 or 2; mobile is always 1).
  - **📤 Publish Layout** — writes `config.json` via the GitHub Contents API (instant, no workflow), so the change is global for every visitor.
  - **↺ Restore Defaults** — resets order/visibility/columns to the original and force-expands every section for a clean slate.
  - Implemented with a React Context + flexbox `order`/width model, so blocks reorder without moving their source.
- **Three independent owner toggles** — The single debug gate was split into three persisted, off-by-default switches so each feature area is controlled on its own: **Enable debug tools** (🐞 Scrape + Debug / 🧹 Clear Debug), **Enable status override** (the Manual Status Override fields, 🔒 Lock, 🛠 Apply Override), and **Enable layout editing** (the Section Layout panel). Each area stays visible but greyed until its toggle is on.
- **🧯 Clear Override** — Instantly clears a manual override by writing an unlocked, reset `status.json` via the Contents API (no workflow wait), so a test value is never left showing. A follow-up **Run Status Check** repopulates the live value.

### Fixed
- **Static ACT 84 wording (two lines)** — Both hardcoded ACT 84 references are now live: the Parole Board factor line no longer says "through May 2026 — over 4 continuous years" (now "to the present — over N continuous years", N computed from the current date), and the Parole Release Projections line no longer says "confirm she remained incarcerated through last month" (now ties the current-custody claim to the live status check via `lastConfirmed`). The month-by-month ACT 84 payment ledger stays as-is, since those are actual recorded amounts.

### Changed
- **Manual Status Override** now lives behind its own toggle rather than the debug toggle, grouping it with Clear Override as a self-contained testing surface.

---

## [1.4.0] — 2026-07-04

### Added
- **Automatic parole detection (Phase 2)** — The scraper now runs a second pass against the **Department Supervised Individual (parolee) locator**. It switches locators by clicking the real `parolee` radio in-page via JavaScript (the input is hidden behind a styled label, so Playwright's `.check()` couldn't act on it), searches by parole number, and detects the `"Department Supervised Individual Search Results"` view to classify a match as **Parolee** — regardless of the fact that this view exposes only a State column. Validated end-to-end against the live portal.
- **Discharge handling (Phase 3)** — When neither locator returns a record and the maximum sentence date has passed, the status resolves to **Discharged**; otherwise it stays an honest **Unknown** (a previously-paroled record that vanishes is flagged for manual verification, never auto-asserted as discharged).
- **Status-reactive banners (Phase 1)** — The Sentence Status section shows a **RELEASED ON PAROLE** or **SENTENCE COMPLETE — DISCHARGED** banner, driven by the live `status.json`.
- **Debug tools master toggle** — A persisted **Enable debug tools** switch in the Setup panel. While off (the default), the entire owner-maintenance surface is disabled and greyed: **🐞 Scrape + Debug**, **🧹 Clear Debug**, the **Manual Status Override** fields (status / location / note), the **🔒 Lock** checkbox, and **🛠 Apply Override** — so none of them can fire by accident. All are guarded at both the UI and handler layers.
- **Persistent override lock** — The **🔒 Lock** preference now persists across reloads (`localStorage`) and defaults **off**, so daily/manual scrapes reflect the real status unless a lock is deliberately set.
- **`config.json` groundwork** — A repo-hosted section-layout schema (per-section order + user/owner visibility + `desktopColumns`) is now in place for the upcoming owner-editable layout system. Nothing consumes it yet.
- **Subject Age Profile** — Added **Age at Parole** and **Age at Release** rows (placeholder `Pending` until those dates are known).
- **Scrape diagnostics** — In `scrape-debug` mode the scraper captures a full landing-page control inventory (`debug/form_recon_*.txt`) and a locator-switch result (`debug/switch_result.txt`), gated by a new `SCRAPE_DEBUG` workflow flag, so selectors can be tuned against the portal's real DOM.

### Fixed
- **Dynamic dates regression (critical)** — A frozen `TODAY = new Date(2026, 5, 16)` had made every derived figure stale. Restored the live clock plus the `fmtMDY` / `lastConfirmed` / `nextBirthday` helpers, so these all compute in real time again: *Days Since Offense*, *Days in Custody*, *Days Past Minimum*, *Days to Max*, *Max % Served*, all four *Parole Projection* day-counts, *current age*, *Years in System* (with its "Age 18 → age N" sublabel), and *Next Birthday* (date + countdown). The custody badge date, the profile **Last Updated** row, the permanent-location line, and the footer **Rendered** date now all read the last-confirmed date instead of a hardcoded `6/16/2026`.
- **Setup panel collapse** — The owner ⚙ Setup panel is now gated by `statusCheckerOpen`, so it collapses together with the DOC Status Checker section instead of staying visible.
- **Inmate/parole field targeting** — The scraper targets the search fields by `id` (`#inmateNumber` / `#paroleNumber`) rather than by name, since the portal reuses `name="inmatenumber"` for both.

### Changed
- **Timeline label consistency** — The three parole projections now uniformly read *Optimistic Release (est.)*, *Likely Release (est.)*, and *Pessimistic Release (est.)* in both the Case Timeline and the Age-Across-Criminal-History timeline; the fixed *Max Release* keeps no `(est.)` since it is a mandatory date, not an estimate.
- **Acronym expansion** — "IPP" in the Prior Criminal Record now reads "IPP (Intermediate Punishment Program)".

### Notes
- **Financial Obligations are not yet auto-updated.** Those figures are transcribed from the docket PDF; the status scraper only tracks custody. Live financial refresh would require a separate UJS-portal scrape and is a candidate for a future enhancement.

---

## [1.3.0] — 2026-07-03

### Added
- **Playwright headless scraper (`scripts/scrape_status.py`)** — The PA DOC Inmate Locator is a JavaScript-rendered, session-based portal that plain HTTP / web search cannot read. The status check now drives a real headless Chromium instance in the workflow, searches by inmate number, parses the rendered result row (`INMATE#  NAME  DOB  LOCATION  COUNTY`), and writes `status.json`. Validated end-to-end against the live portal (returns `Inmate · SCI Cambridge Springs · High`).
- **Manual status override + lock** — Owner-only form in the ⚙ Setup panel to set status / location / note directly. A **🔒 Lock** option writes `locked: true`, and the automated scrape then leaves `status.json` untouched until the owner clears or replaces it — so a value can be pinned (e.g. for a first reveal) regardless of what the daily cron finds.
- **Debug / maintenance tooling** — Two owner-only buttons: **🐞 Scrape + Debug** runs a scrape and commits `debug/` (rendered page text + full-page screenshot) so the result can be reviewed directly in the repo, and **🧹 Clear Debug** removes that folder. Normal and scheduled runs never commit debug output.
- **Status-reactive banners (dynamic status — phase 1)** — The Sentence Status section now shows a **RELEASED ON PAROLE** or **SENTENCE COMPLETE — DISCHARGED** banner (with location and confirmation date) driven by the live `status.json`, in addition to the existing minimum-date-reached notice.

### Changed
- **Status checks are now zero-cost** — Replacing the Anthropic API call with headless scraping means the daily and manual checks make **no API calls at all**. The `ANTHROPIC_API_KEY` secret is no longer used by the status check. The Setup panel's Anthropic-key field was removed and replaced with the manual override.
- **Four-mode workflow** — `check-status.yml` `workflow_dispatch` now takes a `mode`: `scrape` (normal, commits `status.json` only), `scrape-debug` (also commits `debug/`), `manual` (owner override, honors `manual_lock`), and `clear-debug` (removes `debug/`). Scheduled cron runs are always plain `scrape`.
- **Live values throughout the dashboard** — A single frozen "today" constant was making every derived figure stale. `TODAY` is now the real current date, so *Days in Custody*, *Days Past Minimum*, *Days to Max*, *Max % Served*, *Est. Cost*, *current age*, *Years in System*, and *Next Birthday* all compute live. Remaining hardcoded values that would drift (the Age row, Years-in-System, the Next-Birthday year, and the status badge / permanent-location dates) now derive from the current date or the last-confirmed check.
- **Run Status Check cooldown** raised to 90s to accommodate the headless-browser install time; the manual-override path stays fast (30s) since it skips Playwright.
- **AKAs** now read "Jacqueline Chattin · Jacqueline E. Chattin" (the commit/legal name still shows the full middle name).
- **Case Timeline** parole projection now reads "Pessimistic Release (est.)".
- **Official Resources & Source Documents** — Every case (all 8) now lists its Docket and Court Summary PDFs, matching the Prior Criminal Record layout.

### Fixed
- **Scraper classifier** — The initial parser keyed on the string "SCI", which the locator does not print (it lists the facility as e.g. `CAMBRIDGE SPRINGS`). It now parses the actual result row and correctly returns `Inmate · SCI Cambridge Springs · High` instead of `Unknown`.
- **Stale status date** — The custody badge and permanent-location line no longer show a hardcoded `6/16/2026`; they show the real last-confirmed date from `status.json`.

### Infrastructure
- `.gitignore` now lists `/debug/` (CI scratch output, force-committed only in `scrape-debug` mode during tuning).
- Scrape debug files are organized under `debug/` (`page.txt`, `screenshot.png`) and also uploaded as a 7-day workflow artifact.

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
