#!/usr/bin/env python3
import json
import os
import re
from pathlib import Path

LOCALES_DIR = Path(__file__).resolve().parents[1] / 'locales'
REPORT_PATH = Path(__file__).resolve().parents[0] / 'locale_issues_report.json'

PLACEHOLDER_PATTERNS = [r"\{[^}]+\}", r"%[sd]", r"\$\{[^}]+\}"]
PLACEHOLDER_RE = re.compile('|'.join(f'({p})' for p in PLACEHOLDER_PATTERNS))


def flatten(d, parent_key='', sep='.'):
    items = {}
    if isinstance(d, dict):
        for k, v in d.items():
            new_key = parent_key + sep + k if parent_key else k
            if isinstance(v, dict):
                items.update(flatten(v, new_key, sep=sep))
            else:
                items[new_key] = v
    else:
        items[parent_key] = d
    return items


def extract_placeholders(s):
    if not isinstance(s, str):
        return set()
    return set(m.group(0) for m in PLACEHOLDER_RE.finditer(s))


def load_json(p):
    with open(p, 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    en_file = LOCALES_DIR / 'en.json'
    if not en_file.exists():
        print('en.json not found in widget-app locales')
        return

    en = load_json(en_file)
    en_flat = flatten(en)

    issues = {}

    for p in sorted(LOCALES_DIR.glob('*.json')):
        name = p.name
        if name == 'en.json':
            continue
        data = load_json(p)
        flat = flatten(data)

        untranslated = []
        empty = []
        placeholder_mismatches = []
        suspicious_markers = []

        for k, en_val in en_flat.items():
            loc_val = flat.get(k)
            if loc_val is None:
                continue
            if isinstance(loc_val, str) and loc_val.strip() == '':
                empty.append(k)
                continue
            if isinstance(loc_val, str) and (loc_val.strip().startswith('PL:') or 'TODO' in loc_val or '__MISSING__' in loc_val):
                suspicious_markers.append(k)
            if loc_val == en_val and isinstance(en_val, str):
                untranslated.append({'key': k, 'value': loc_val})
            en_ph = extract_placeholders(en_val)
            loc_ph = extract_placeholders(loc_val)
            if en_ph != loc_ph:
                if en_ph or loc_ph:
                    placeholder_mismatches.append({'key': k, 'en': sorted(list(en_ph)), 'loc': sorted(list(loc_ph))})

        issues[name] = {
            'total_keys': len(flat),
            'empty_values_count': len(empty),
            'empty_values_sample': empty[:10],
            'untranslated_count': len(untranslated),
            'untranslated_sample': untranslated[:10],
            'suspicious_markers_count': len(suspicious_markers),
            'suspicious_markers_sample': suspicious_markers[:10],
            'placeholder_mismatches_count': len(placeholder_mismatches),
            'placeholder_mismatches_sample': placeholder_mismatches[:10],
        }

    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(issues, f, ensure_ascii=False, indent=2)

    QUIET = os.getenv('QUIET_LOCALE') in ('1', 'true', 'True')

    if not QUIET:
        for name, r in issues.items():
            print(f"{name}: untranslated={r['untranslated_count']}, empty={r['empty_values_count']}, markers={r['suspicious_markers_count']}, placeholder_mismatch={r['placeholder_mismatches_count']}")
        print('\nFull JSON report written to:', REPORT_PATH)


if __name__ == '__main__':
    main()
