#!/usr/bin/env python3
"""
translate_locales.py
====================

Synchronises the widget-app locale JSON files (widget-app/locales/)
with en.json by machine-translating any value that is missing from a target
locale or needs to be refreshed.

By default only fills keys that are absent from the target file. Pass
--overwrite to replace all existing values, or use --key to narrow the scope
to specific top-level keys.

WHAT GETS TRANSLATED
--------------------
Every string value in the JSON tree, including:
  - Top-level flat strings
  - Strings inside nested dicts (e.g. chatControl, unreadMessages, sourcesCount)

USAGE
-----
Fill missing keys in all locales:
    python3 translate_locales.py

Fill missing keys in one locale:
    python3 translate_locales.py --only fr

Fill missing keys in multiple locales:
    python3 translate_locales.py --only fr de es

Re-translate everything in one locale (overwrite existing values):
    python3 translate_locales.py --only fr --overwrite

Re-translate specific top-level keys:
    python3 translate_locales.py --only fr --key chatControl unreadMessages --overwrite

REQUIREMENTS
------------
    pip install deep-translator

Uses the free Google Translate tier — no API key required. For large runs
the script saves progress after every top-level key so Ctrl+C is safe.

LANGUAGE CODE MAPPING
---------------------
Project locale codes that differ from Google Translate codes are listed in
LANG_MAP at the top of this file (e.g. nb -> no for Norwegian Bokmål).
"""

import argparse
import glob
import json
import os
import time

from deep_translator import GoogleTranslator

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Map project locale codes to Google Translate language codes where they differ
LANG_MAP = {
    "nb": "no",
}

# Keys whose values should NOT be translated (technical identifiers, placeholders, etc.)
SKIP_KEYS = set()

# Delay between translation requests (seconds) — be gentle with the free tier
REQUEST_DELAY = 0.15

# ---------------------------------------------------------------------------
# Translation helpers
# ---------------------------------------------------------------------------

def translate_text(text: str, target: str, retries: int = 3) -> str | None:
    """Translate a single string. Returns None if all attempts fail."""
    for attempt in range(retries):
        try:
            result = GoogleTranslator(source="en", target=target).translate(text)
            return result
        except Exception as exc:
            wait = 2 ** attempt
            print(f"      translate error (attempt {attempt + 1}/{retries}): {exc}")
            if attempt < retries - 1:
                print(f"      retrying in {wait}s...")
                time.sleep(wait)
    return None


def translate_string(s: str, target: str) -> str:
    """Translate a string, falling back to the English original on failure."""
    if not s or not s.strip():
        return s
    result = translate_text(s, target)
    time.sleep(REQUEST_DELAY)
    if result is None:
        print(f"      WARNING: translation failed — keeping English")
        return s
    return result


# ---------------------------------------------------------------------------
# Recursive value translator
# ---------------------------------------------------------------------------

def translate_value(key: str, value, target: str, overwrite: bool):
    """
    Recursively translate a JSON value.

    - str  → translate directly
    - dict → translate each value recursively

    `overwrite` controls whether existing non-empty strings are replaced.
    """
    if key in SKIP_KEYS:
        return value

    if isinstance(value, str):
        if not overwrite and value:
            return value  # already has a value, don't overwrite
        print(f"      string ({len(value)} chars)")
        return translate_string(value, target)

    if isinstance(value, dict):
        return {
            k: translate_value(k, v, target, overwrite)
            for k, v in value.items()
        }

    # numbers, booleans, null — pass through unchanged
    return value


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Sync widget locale JSON files with en.json via machine translation.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Translate only missing keys in all locales
  python3 translate_locales.py

  # Translate only missing keys in French only
  python3 translate_locales.py --only fr

  # Translate only missing keys in French and German
  python3 translate_locales.py --only fr de

  # Re-translate everything in all locales (overwrite existing)
  python3 translate_locales.py --overwrite

  # Re-translate everything in French (overwrite existing)
  python3 translate_locales.py --only fr --overwrite

  # Re-translate specific top-level keys in all locales
  python3 translate_locales.py --key chatControl unreadMessages --overwrite

  # Re-translate specific top-level keys in French
  python3 translate_locales.py --only fr --key chatControl unreadMessages --overwrite
        """,
    )
    parser.add_argument(
        "--only",
        metavar="LOCALE",
        nargs="+",
        help="Only process these locale codes, space-separated (e.g. 'fr de es')",
        default=None,
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing translated values (default: only fill missing keys)",
    )
    parser.add_argument(
        "--key",
        metavar="KEY",
        nargs="+",
        help="Only translate these top-level keys, space-separated (e.g. --key chatControl unreadMessages)",
        default=None,
    )
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    base = os.path.normpath(os.path.join(script_dir, "..", "locales"))
    en_path = os.path.join(base, "en.json")

    if not os.path.exists(en_path):
        print(f"ERROR: {en_path} not found.")
        return

    with open(en_path, "r", encoding="utf-8") as f:
        en_data = json.load(f)

    # Validate --key
    if args.key:
        bad = [k for k in args.key if k not in en_data]
        if bad:
            print(f"ERROR: key(s) not found in en.json: {', '.join(bad)}")
            return

    # Collect target locale files
    all_files = sorted(glob.glob(os.path.join(base, "*.json")))
    locale_files = [p for p in all_files if os.path.basename(p) != "en.json"]

    if args.only:
        locale_files = []
        for code in args.only:
            only_path = os.path.join(base, f"{code}.json")
            if not os.path.exists(only_path):
                print(f"ERROR: no locale file for '{code}' at {only_path}")
                return
            locale_files.append(only_path)

    summary = {}

    for path in locale_files:
        lang = os.path.splitext(os.path.basename(path))[0]
        target = LANG_MAP.get(lang, lang)
        print(f"\n{'='*60}")
        print(f"  {os.path.basename(path)}  →  target language '{target}'")
        print(f"{'='*60}")

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        keys_written = 0

        try:
            keys_to_process = args.key if args.key else list(en_data.keys())

            for key in keys_to_process:
                en_val = en_data[key]
                existing_val = data.get(key)

                # Skip if already present and not overwriting
                if existing_val is not None and not args.overwrite:
                    continue

                print(f"\n  [{key}]")
                translated_val = translate_value(key, en_val, target, overwrite=args.overwrite)

                data[key] = translated_val
                keys_written += 1

                # Incremental save after each top-level key
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    f.write("\n")

        except KeyboardInterrupt:
            print("\n\nInterrupted — progress has been saved.")

        summary[lang] = keys_written
        print(f"\n  {lang}: {keys_written} key(s) written")

    print(f"\n{'='*60}")
    print("Summary")
    print(f"{'='*60}")
    for lang, count in summary.items():
        print(f"  {lang}: {count} key(s) written")


if __name__ == "__main__":
    main()
