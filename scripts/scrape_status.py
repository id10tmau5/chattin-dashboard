#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  scrape_status.py
#  Author:       Rocky Cooper
#  Version:      1.3.2
#  Description:  Headless-browser scraper for the PA DOC Inmate/Parolee Locator
#                (inmatelocator.cor.pa.gov). The locator is a JavaScript-rendered,
#                session-based portal that plain HTTP / web search cannot read, so
#                this drives a real Chromium instance via Playwright.
#                Multi-pass logic:
#                  Pass 1 (inmate #) → active incarceration (Inmate).
#                  Pass 2 (parole #, Supervised locator) → Parolee     [Phase 2].
#                  Neither + max date passed → Discharged               [Phase 3].
#                  Neither + before max date → Unknown (never asserts discharge
#                  without evidence).
#                Respects an owner lock (locked=true) and preserves a confident
#                manual override rather than clobbering it with a flaky Unknown.
#                In scrape-debug mode (SCRAPE_DEBUG=true) it also captures a
#                landing-page control inventory (debug/form_recon_*.txt) and runs
#                the supervised pass for tuning, without changing the status result.
#  Requirements: Python 3.10+, playwright (chromium) — installed by the workflow.
#  Associated files:
#                - .github/workflows/check-status.yml   (invokes this script)
#                - status.json                          (output, committed by CI)
#                - debug/page_*.txt / debug/screenshot_*.png / debug/form_recon_*.txt
#                  (CI artifacts, gitignored; committed only in scrape-debug mode)
# ─────────────────────────────────────────────────────────────────────────────
import json
import os
import re
import sys
import datetime
from playwright.sync_api import sync_playwright

# ── Subject / portal constants ───────────────────────────────────────────────
INMATE_NUMBER = "PE1239"
PAROLE_NUMBER = "345JW"
LAST_NAME     = "Chattin"
FIRST_NAME    = "Jacqueline"
PORTAL_URL    = "https://inmatelocator.cor.pa.gov/"
STATUS_FILE   = "status.json"
DEBUG_DIR     = "debug"                       # CI scratch dir (never committed normally)
MAX_DATE      = datetime.date(2033, 6, 8)     # maximum sentence date (Phase 3 threshold)

NO_HIT_PATTERNS = (
    "no records", "no results", "no matching record",
    "0 records", "did not match", "no inmate found",
)
PAROLE_HINTS = ("district", "parole", "supervis", "community corrections", "ccc")


def utc_now():
    """Return current UTC time as an ISO-8601 'Z' string."""
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


# ── Result-parsing helpers (reusable) ────────────────────────────────────────
def find_person_row(text):
    """
    Return the first rendered line that clearly matches our subject, or None.
    Matches either the inmate number, or the full name (last AND first) so a
    last-name search can't false-match a different 'Chattin'.
    """
    for line in text.splitlines():
        u = line.upper()
        if INMATE_NUMBER in u:
            return line.strip()
        if LAST_NAME.upper() in u and FIRST_NAME.upper() in u:
            return line.strip()
    return None


def parse_location(row):
    """
    Extract the Current Location from a locator result row.
    Row shape: [INMATE#] NAME DOB LOCATION [COUNTY]  (whitespace/tab separated).
    Anchors on the date of birth, then takes the remainder minus a trailing
    committing-county token. Best-effort — returns None if it can't parse.
    """
    m = re.search(r"\d{2}/\d{2}/\d{4}\s+(.+)$", row)
    if not m:
        return None
    toks = m.group(1).split()
    if len(toks) >= 2:
        return " ".join(toks[:-1]).title()   # drop trailing county token
    return toks[0].title() if toks else None


def classify(text):
    """
    Map one locator view's rendered text to (status, location, notes, confidence).
    status is one of: Inmate, Parolee, Unknown. 'Unknown' means this view had no
    usable match — the caller decides what to do next (try another pass / Phase 3).
    """
    row = find_person_row(text)
    if row:
        rl  = row.lower()
        loc = parse_location(row)
        if any(k in rl for k in PAROLE_HINTS):
            return ("Parolee", loc,
                    f"Locator indicates community supervision{' at ' + loc if loc else ''}.",
                    "Medium")
        if loc:
            label = loc if loc.lower().startswith("sci") else f"SCI {loc}"
            return ("Inmate", label,
                    f"Inmate locator lists active incarceration at {label}.", "High")
        return ("Unknown", None,
                "Record matched but status/location could not be parsed — see debug artifact.",
                "Low")

    if any(p in text.lower() for p in NO_HIT_PATTERNS):
        return ("Unknown", None, "No matching record in this locator view.", "Low")
    return ("Unknown", None, "No matching record parsed from this view — see debug artifact.", "Low")


# ── status.json helpers ──────────────────────────────────────────────────────
def load_existing():
    """Load the current status.json if present, else None."""
    try:
        with open(STATUS_FILE) as f:
            return json.load(f)
    except Exception:
        return None


def write_status(status, location, notes, confidence, checked_by):
    """Assemble and write the full status.json payload."""
    payload = {
        "status":            status,
        "currentLocation":   location,
        "permanentLocation": None,
        "inmateNumber":      INMATE_NUMBER,
        "paroleNumber":      "345JW",
        "lastDOCUpdate":     None,
        "age":               None,
        "notes":             notes,
        "sourcesChecked":    ["inmatelocator.cor.pa.gov (Playwright headless scrape)"],
        "confidence":        confidence,
        "lastChecked":       utc_now(),
        "checkedBy":         checked_by,
    }
    with open(STATUS_FILE, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote status: {status} | loc={location} | confidence={confidence}")


# ── Scraping ─────────────────────────────────────────────────────────────────

def capture_controls(page):
    """
    Return a text inventory of every interactive control on the current page
    (inputs, selects, buttons, radios, tabs, links). Used to tune selectors against
    the portal's real DOM — dumped to debug/ and only committed in scrape-debug mode.
    """
    js = """() => {
      const out = [];
      const els = document.querySelectorAll('input, select, button, a, label, [role=tab], [role=radio], [role=button]');
      els.forEach(e => {
        const opts = e.tagName === 'SELECT'
          ? Array.from(e.options).map(o => o.text).join(' | ') : '';
        out.push([
          e.tagName,
          'name=' + (e.name || ''),
          'id=' + (e.id || ''),
          'type=' + (e.type || ''),
          'placeholder=' + (e.placeholder || ''),
          'text=' + ((e.innerText || e.value || '').trim().slice(0, 50)),
          opts ? 'options=[' + opts + ']' : ''
        ].filter(Boolean).join('  '));
      });
      return out.join('\\n');
    }"""
    try:
        return page.evaluate(js)
    except Exception as e:
        return f"(recon failed: {e})"


def switch_to_supervised(page):
    """
    Switch the portal to the Department Supervised Individual (parolee) locator.
    The real radio (<input name="check" value="parolee">) is usually hidden behind
    a styled label, so Playwright's .check() fails its actionability check. We click
    it in-page via JavaScript, which fires the event the app listens for regardless
    of visibility. Returns a short status string (also written to
    debug/switch_result.txt) so the switch can be diagnosed from the debug artifacts.
    """
    try:
        status = page.evaluate(r"""() => {
          const radios = Array.from(document.querySelectorAll('input[name="check"]'));
          if (!radios.length) return 'no-radios-found';
          const inv = radios.map(r => `${r.value}:${r.checked}`).join(', ');
          const p = radios.find(r => (r.value || '').toLowerCase().includes('parol'));
          if (!p) return 'parolee-radio-not-found [' + inv + ']';
          p.click();
          return (p.checked ? 'switched-checked' : 'clicked-not-checked') + ' [' + inv + ' -> parolee:' + p.checked + ']';
        }""")
    except Exception as e:
        status = f'error:{e}'
    page.wait_for_timeout(1200)
    try:
        with open(f"{DEBUG_DIR}/switch_result.txt", "w") as f:
            f.write(status + "\n")
    except Exception:
        pass
    return status


def scrape_search(query, mode, tag):
    """
    Drive Chromium against the locator and return the rendered body text.
    mode='number' fills the inmate-number field; mode='supervised' switches to the
    Department Supervised Individual Locator then fills the parole-number field;
    mode='name' fills the last-name field. Saves per-pass debug (text, screenshot,
    and a landing-page control inventory) under debug/.
    """
    if mode == "number":
        # Inmate Number field — id=inmateNumber (name is ambiguously shared).
        selectors = ('#inmateNumber', 'input[id="inmateNumber"]',
                     'input[name="inmatenumber"]', 'input[name*="inmate" i]')
    elif mode == "supervised":
        # Parole Number field — id=paroleNumber (shares name="inmatenumber", so id only).
        selectors = ('#paroleNumber', 'input[id="paroleNumber"]',
                     'input[id*="parole" i]', 'input[type="text"]')
    else:  # name
        selectors = ('#lastName', 'input[id="lastName"]', 'input[name="lastname"]',
                     'input[name*="last" i]', 'input[type="text"]')

    page_text = ""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            page.goto(PORTAL_URL, timeout=45000, wait_until="domcontentloaded")
            page.wait_for_timeout(3500)  # let the JS app boot

            # Recon: dump the landing-page control inventory for selector tuning.
            try:
                with open(f"{DEBUG_DIR}/form_recon_{tag}.txt", "w") as f:
                    f.write(capture_controls(page))
            except Exception:
                pass

            # Supervised pass must switch locators before searching.
            if mode == "supervised":
                switch_to_supervised(page)

            filled = False
            for sel in selectors:
                try:
                    el = page.query_selector(sel)
                    if el:
                        el.fill(query)
                        filled = True
                        break
                except Exception:
                    continue

            if filled:
                try:
                    page.keyboard.press("Enter")
                except Exception:
                    pass
                for bsel in ('button:has-text("Search")', 'input[type="submit"]', 'button[type="submit"]'):
                    try:
                        b = page.query_selector(bsel)
                        if b:
                            b.click()
                            break
                    except Exception:
                        continue
                page.wait_for_timeout(5000)  # let results render

            page_text = page.inner_text("body")
        except Exception as e:
            page_text = ""
            print(f"Scrape error ({mode}): {e}", file=sys.stderr)
        finally:
            try:
                os.makedirs(DEBUG_DIR, exist_ok=True)
                page.screenshot(path=f"{DEBUG_DIR}/screenshot_{tag}.png", full_page=True)
            except Exception:
                pass
            browser.close()

    try:
        with open(f"{DEBUG_DIR}/page_{tag}.txt", "w") as f:
            f.write(page_text or "(empty — scrape returned no text)")
    except Exception:
        pass
    return page_text


def main():
    os.makedirs(DEBUG_DIR, exist_ok=True)

    # Owner lock: a manual override with locked=true freezes status.json.
    existing = load_existing()
    if existing and existing.get("locked"):
        print("Owner lock active — scrape skipped; status.json unchanged.")
        return

    checked_by = os.environ.get("CHECKED_BY", "GitHub Actions (automated portal scrape)")
    debug_mode = os.environ.get("SCRAPE_DEBUG", "").lower() == "true"

    # ── Pass 1 — inmate-number search (active incarceration) ─────────────────
    s1 = classify(scrape_search(INMATE_NUMBER, "number", "number"))
    if s1[0] in ("Inmate", "Parolee"):
        # In debug mode, still run the supervised pass purely to capture recon /
        # results for tuning — but keep Pass 1's authoritative status.
        if debug_mode:
            scrape_search(PAROLE_NUMBER, "supervised", "supervised")
        write_status(*s1, checked_by)
        return

    # ── Pass 2 (Phase 2) — Department Supervised Individual Locator ───────────
    # Switches to the supervised locator and searches by parole number.
    s2 = classify(scrape_search(PAROLE_NUMBER, "supervised", "supervised"))
    if s2[0] in ("Inmate", "Parolee"):
        write_status(*s2, checked_by)
        return

    # ── Preserve a confident manual override rather than overwrite with Unknown ─
    if (existing
            and "manual override" in str(existing.get("checkedBy", "")).lower()
            and existing.get("status") not in (None, "", "Unknown")):
        payload = dict(existing)
        payload["lastChecked"] = utc_now()
        payload["notes"] = (existing.get("notes") or "Manually set by owner.") + \
            f" · Automated scrape on {utc_now()[:10]} could not confirm; manual value retained."
        with open(STATUS_FILE, "w") as f:
            json.dump(payload, f, indent=2)
        print(f"Manual override retained (scrape inconclusive): {payload['status']}")
        return

    # ── Phase 3 — discharge vs. unknown ──────────────────────────────────────
    today   = datetime.date.today()
    was_par = existing and str(existing.get("status", "")).lower() == "parolee"

    if today >= MAX_DATE:
        write_status(
            "Discharged", None,
            "Maximum sentence date has passed and no active record appears in the "
            "inmate or supervised locator — sentence complete.",
            "Medium", checked_by,
        )
    elif was_par:
        # Previously on parole, now absent from both views. Suggestive of discharge
        # but not proof (could be a portal hiccup) — report Unknown, flag for review.
        write_status(
            "Unknown", None,
            "Previously listed on parole but no longer found in the inmate or supervised "
            "locator. May indicate discharge — verify via VINELink or PA SAVIN before relying on it.",
            "Low", checked_by,
        )
    else:
        write_status(
            "Unknown", None,
            "No active record found by inmate number or name in the DOC locator. Not "
            "confirmation of discharge — verify via VINELink or by calling PA SAVIN.",
            "Low", checked_by,
        )


if __name__ == "__main__":
    main()
