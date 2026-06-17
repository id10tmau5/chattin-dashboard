# Commonwealth v. Chattin — Case Dashboard

**Docket:** CP-54-CR-0000435-2021 · Schuylkill County Court of Common Pleas  
**Subject:** Jacqueline Elizabeth Chattin · Inmate #PE1239 · Parole #345JW  
**Live dashboard:** https://id10tmau5.github.io/chattin-dashboard/

---

## Overview

A self-contained case tracking dashboard built with React, hosted on GitHub Pages, with automated DOC status checking via GitHub Actions and the Anthropic API.

All data displayed is sourced from public court records (PA UJS Portal, PA DOC Inmate Locator) and is a matter of public record.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Main dashboard — open this URL or the file directly in any browser |
| `chattin-case-dashboard.jsx` | React source (for editing in Claude or another editor) |
| `status.json` | Latest DOC status — written by GitHub Actions on each run |
| `.github/workflows/check-status.yml` | Manual-trigger GitHub Actions workflow |

---

## Status Check Setup

The **Run Status Check** button in the dashboard triggers the `check-status.yml` workflow, which:
1. Calls the Anthropic API with web search to look up Jackie's current DOC status
2. Writes the result to `status.json`
3. Commits and pushes `status.json` back to this repo
4. GitHub Pages serves the updated file within seconds

The **Check for Updates** button simply re-fetches `status.json` to display the latest result.

### One-time setup required

**1. Add your Anthropic API key as a GitHub Secret:**
   - Go to this repo → Settings → Secrets and variables → Actions → New repository secret
   - Name: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-...` key from console.anthropic.com
   - *(Alternatively, use the ⚙ Configure panel in the dashboard to update it in-browser)*

**2. Create a GitHub Personal Access Token (PAT) for the dashboard buttons:**
   - Go to github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token → select `repo` scope → generate
   - In the dashboard, click **⚙ configure** → paste the token → Save Token
   - The token is stored in your browser's `localStorage` only — never sent to any server except `api.github.com`

**3. Enable GitHub Pages** (if not already):
   - Repo → Settings → Pages → Source: Deploy from branch → Branch: `main` / `/ (root)` → Save

---

## Required PAT Permissions

| Feature | Required Scope |
|---------|---------------|
| Run Status Check (trigger workflow) | `repo` |
| Edit API Key (update GitHub Secret) | `repo` |

A classic PAT with `repo` scope covers both. Fine-grained PAT alternative: `Actions: Write` + `Secrets: Write`.

---

## Source Documents

- [UJS Case Search](https://ujsportal.pacourts.us/casesearch) — search docket CP-54-CR-0000435-2021
- [PA DOC Inmate Locator](https://inmatelocator.cor.pa.gov/) — search PE1239
- [VINELink PA VINE](https://vinelink.vineapps.com/state/PA) — register for custody change alerts

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
