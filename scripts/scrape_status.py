#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  scrape_status.py
#  Author:       Rocky Cooper
#  Version:      1.1.0
#  Description:  Headless-browser scraper for the PA DOC Inmate/Parolee Locator
#                (inmatelocator.cor.pa.gov). The locator is a JavaScript-rendered,
#                session-based portal that plain HTTP / web-search cannot read, so
#                this drives a real Chromium instance via Playwright, searches by
#                inmate number, captures the rendered result, and writes status.json.
#                Saves debug/page.txt + debug/screenshot.png as CI artifacts so the
#                selectors/heuristics can be tuned against what the portal actually
#                returns. Respects an owner lock and never silently clobbers a
#                manual owner override with a low-confidence "Unknown".
#  Requirements: Python 3.10+, playwright (chromium) — installed in the workflow.
#  Associated files:
#                - .github/workflows/check-status.yml  (invokes this script)
#                - status.json                         (output, committed by CI)
#                - debug/page.txt / debug/screenshot.png (CI artifacts, gitignored)
# ─────────────────────────────────────────────────────────────────────────────
import json
import os
import re
import sys
import datetime
from playwright.sync_api import sync_playwright

INMATE_NUMBER = "PE1239"
LAST_NAME     = "Chattin"
PORTAL_URL    = "https://inmatelocator.cor.pa.gov/"
STATUS_FILE   = "status.json"
DEBUG_DIR     = "debug"        # CI-artifact scratch dir (never committed)


def utc_now():
    """Return current UTC time as an ISO-8601 'Z' string."""
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def classify(text):
    """
    Map the locator's rendered result table to a custody status.
    The PA inmate locator returns a row: INMATE#  NAME  DOB  LOCATION  COUNTY
    (e.g. "PE1239  JACQUELINE ELIZABETH CHATTIN  02/21/1991  CAMBRIDGE SPRINGS  SCHUYLKILL").
    Returns (status, location, notes, confidence).
    Absence of a record is Unknown/Low — NOT proof of discharge (a parolee instead
    appears in the separate Department Supervised Individual locator).
    """
    t = text.lower()
    no_hit = any(p in t for p in (
        "no records", "no results", "no matching record",
        "0 records", "did not match", "no inmate found",
    ))

    # Parse the result row anchored on the inmate number.
    row = re.search(
        re.escape(INMATE_NUMBER) + r"\s+([A-Za-z .'-]+?)\s+(\d{2}/\d{2}/\d{4})\s+(.+)",
        text,
    )
    location = None
    if row:
        rest = row.group(3).splitlines()[0].strip()
        toks = [x for x in rest.split() if x]
        if len(toks) >= 2:        # drop the trailing committing-county token
            location = " ".join(toks[:-1]).title()
        elif toks:
            location = toks[0].title()

    if row and location:
        # A district/parole office in the location field means supervision, not custody.
        if any(k in location.lower() for k in ("district", "office", "parole", "supervis")):
            return ("Parolee", location,
                    f"Locator lists supervision at {location}.", "Medium")
        loc_label = location if location.lower().startswith("sci") else f"SCI {location}"
        return ("Inmate", loc_label,
                f"Inmate locator lists active incarceration at {loc_label}.", "High")

    if no_hit:
        return ("Unknown", None,
                "Inmate locator returned no matching record. Not confirmation of discharge — "
                "a paroled individual may instead appear in the Department Supervised Individual locator.",
                "Low")

    return ("Unknown", None,
            "Record not parsed from the rendered page — see debug artifact.", "Low")


def load_existing():
    """Load the current status.json if present, else None."""
    try:
        with open(STATUS_FILE) as f:
            return json.load(f)
    except Exception:
        return None


def scrape():
    """Drive Chromium against the locator and return the rendered body text (or '')."""
    page_text = ""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            page.goto(PORTAL_URL, timeout=45000, wait_until="domcontentloaded")
            page.wait_for_timeout(3500)  # let the JS app boot

            # Fill the search field — try several selectors since the DOM may vary.
            filled = False
            for sel in (
                'input[name*="number" i]', 'input[id*="number" i]',
                'input[placeholder*="number" i]', 'input[name*="inmate" i]',
                'input[type="text"]',
            ):
                try:
                    el = page.query_selector(sel)
                    if el:
                        el.fill(INMATE_NUMBER)
                        filled = True
                        break
                except Exception:
                    continue

            # Submit — press Enter, then try an explicit Search button as backup.
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
            print(f"Scrape error: {e}", file=sys.stderr)
        finally:
            try:
                os.makedirs(DEBUG_DIR, exist_ok=True)
                page.screenshot(path=f"{DEBUG_DIR}/screenshot.png", full_page=True)
            except Exception:
                pass
            browser.close()
    return page_text


def main():
    os.makedirs(DEBUG_DIR, exist_ok=True)

    # Owner lock: if a manual override set locked=true, the automated scrape leaves
    # status.json untouched until the owner clears/replaces it.
    existing = load_existing()
    if existing and existing.get("locked"):
        print("Owner lock active — scrape skipped; status.json unchanged.")
        return

    checked_by = os.environ.get("CHECKED_BY", "GitHub Actions (automated portal scrape)")
    page_text  = scrape()

    # Always drop a debug copy of what the portal rendered.
    try:
        with open(f"{DEBUG_DIR}/page.txt", "w") as f:
            f.write(page_text or "(empty — scrape returned no text)")
    except Exception:
        pass

    if page_text.strip():
        status_val, loc, notes, conf = classify(page_text)
    else:
        status_val, loc, notes, conf = ("Unknown", None,
            "Headless scrape could not load the portal this run.", "Low")

    # Preserve a confident manual override: don't let a flaky Unknown wipe it.
    existing = load_existing()
    if (existing and status_val == "Unknown" and conf == "Low"
            and "manual override" in str(existing.get("checkedBy", "")).lower()
            and existing.get("status") not in (None, "", "Unknown")):
        status = dict(existing)
        status["lastChecked"] = utc_now()
        status["notes"] = (existing.get("notes") or "Manually set by owner.") + \
            f" · Automated scrape on {utc_now()[:10]} could not confirm; manual value retained."
        with open(STATUS_FILE, "w") as f:
            json.dump(status, f, indent=2)
        print(f"Manual override retained (scrape inconclusive): {status['status']}")
        return

    status = {
        "status":            status_val,
        "currentLocation":   loc,
        "permanentLocation": None,
        "inmateNumber":      INMATE_NUMBER,
        "paroleNumber":      "345JW",
        "lastDOCUpdate":     None,
        "age":               None,
        "notes":             notes,
        "sourcesChecked":    ["inmatelocator.cor.pa.gov (Playwright headless scrape)"],
        "confidence":        conf,
        "lastChecked":       utc_now(),
        "checkedBy":         checked_by,
    }
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)
    print(f"Scrape result: {status_val} | loc={loc} | confidence={conf}")


if __name__ == "__main__":
    main()
