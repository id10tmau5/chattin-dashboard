#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
#  scrape_status.py
#  Author:       Rocky Cooper
#  Version:      1.0.0
#  Description:  Headless-browser scraper for the PA DOC Inmate/Parolee Locator
#                (inmatelocator.cor.pa.gov). The locator is a JavaScript-rendered,
#                session-based portal that plain HTTP / web-search cannot read, so
#                this drives a real Chromium instance via Playwright, searches by
#                inmate number, captures the rendered result, and writes status.json.
#                Saves debug_page.txt + debug_screenshot.png as CI artifacts so the
#                selectors/heuristics can be tuned against what the portal actually
#                returns. Never silently clobbers a manual owner override with a
#                low-confidence "Unknown".
#  Requirements: Python 3.10+, playwright (chromium) — installed in the workflow.
#  Associated files:
#                - .github/workflows/check-status.yml  (invokes this script)
#                - status.json                         (output, committed by CI)
#                - debug_page.txt / debug_screenshot.png (CI artifacts)
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


def utc_now():
    """Return current UTC time as an ISO-8601 'Z' string."""
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def extract_facility(text):
    """Pull an 'SCI <Name>' facility string out of the rendered page text, if present."""
    m = re.search(r"SCI[\s\-]+[A-Z][A-Za-z.\-]+(?:\s+[A-Z][A-Za-z.\-]+)?", text)
    return m.group(0).strip() if m else None


def classify(text):
    """
    Heuristically map the locator's rendered text to a custody status.
    Returns (status, location, notes, confidence).
    Absence of a record is treated as Unknown/Low — it is NOT proof of discharge.
    """
    t   = text.lower()
    loc = extract_facility(text)

    no_hit = any(p in t for p in (
        "no records", "no results", "no matching", "not found",
        "0 records", "no inmate", "did not match",
    ))
    if no_hit:
        return ("Unknown", None,
                "Locator returned no matching record. This is not confirmation of "
                "discharge — it can also mean a portal hiccup or a changed record.",
                "Low")

    matched = (INMATE_NUMBER.lower() in t) or (LAST_NAME.lower() in t)
    if matched:
        if any(p in t for p in ("parole", "community corrections", "board of probation", "ccc", "supervised")):
            return ("Parolee", loc,
                    "Locator indicates parole / community supervision.", "Medium")
        if loc or " sci " in f" {t} ":
            return ("Inmate", loc,
                    f"Locator shows active incarceration{' at ' + loc if loc else ''}.", "High")
        return ("Unknown", loc,
                "Record matched but the status text could not be parsed — see debug artifact.",
                "Low")

    return ("Unknown", None,
            "No matching record found in the rendered page — see debug artifact.", "Low")


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
                page.screenshot(path="debug_screenshot.png", full_page=True)
            except Exception:
                pass
            browser.close()
    return page_text


def main():
    checked_by = os.environ.get("CHECKED_BY", "GitHub Actions (automated portal scrape)")
    page_text  = scrape()

    # Always drop a debug copy of what the portal rendered.
    try:
        with open("debug_page.txt", "w") as f:
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
