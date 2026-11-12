#!/usr/bin/env python3
"""Add named cars from Wikipedia categories without changing existing IDs."""
import hashlib
import json
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import quote, urlencode

ROOT = Path(__file__).resolve().parents[1]
API = 'https://en.wikipedia.org/w/api.php'
CATEGORIES = {
    'Hatchbacks': ('sedan', '两厢车 hatchback'),
    'Station wagons': ('sedan', '旅行车 station wagon'),
    'Pickup trucks': ('suv', '皮卡 pickup'),
    'Minivans': ('suv', 'MPV minivan'),
    'Vans': ('suv', '厢式车 van'),
    'Coupés': ('sport', '双门轿跑 coupe'),
    'Convertibles': ('roadster', '敞篷车 convertible'),
}

def normalized(text):
    return re.sub(r'[^a-z0-9]+', '', text.casefold())

existing = []
for filename in ('vehicle-catalog.json', 'family-catalog.json'):
    existing.extend(json.loads((ROOT / 'data' / filename).read_text()))
known = {(normalized(row['brand']), normalized(row['model'])) for row in existing}
brands = sorted({row['brand'] for row in existing}, key=len, reverse=True)
previous = ROOT / 'data/global-catalog.json'
rows = json.loads(previous.read_text()) if previous.exists() else []
known.update((normalized(row['brand']), normalized(row['model'])) for row in rows)
counts = {}
failed = []
for category, (body, styles) in CATEGORIES.items():
    params = {'action': 'query', 'list': 'categorymembers', 'cmtitle': 'Category:' + category,
              'cmtype': 'page', 'cmlimit': 500, 'format': 'json'}
    added = 0
    while True:
        try:
            response = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '40', '--retry', '2', '--retry-all-errors',
                                       '--user-agent', 'EmberGarageCatalog/1.0 (local educational game)',
                                       API + '?' + urlencode(params)], capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError:
            failed.append(category)
            print(f'{category}: request failed; keeping previously imported entries', flush=True)
            break
        payload = json.loads(response.stdout)
        if 'error' in payload:
            raise RuntimeError(payload['error'])
        for page in payload['query']['categorymembers']:
            title = page['title']
            brand = next((b for b in brands if title.casefold().startswith(b.casefold() + ' ')), None)
            if not brand:
                continue
            model = re.sub(r'\s*\((?:automobile|car)\)$', '', title[len(brand):].strip(), flags=re.I)
            key = (normalized(brand), normalized(model))
            if not model or key in known:
                continue
            known.add(key)
            rows.append({'id': 'global-' + hashlib.sha256(f'{brand}|{model}'.encode()).hexdigest()[:16],
                         'brand': brand, 'model': model, 'years': '年代未核实', 'year': None,
                         'styles': styles, 'country': '', 'concept': False,
                         'source': 'https://en.wikipedia.org/wiki/' + quote(title.replace(' ', '_')),
                         'vehicleClass': body})
            added += 1
        if 'continue' not in payload:
            break
        params.update(payload['continue'])
        time.sleep(.1)
    counts[category] = added
    print(f'{category}: {added}', flush=True)

rows.sort(key=lambda row: (row['brand'].casefold(), row['model'].casefold()))
(ROOT / 'data/global-catalog.json').write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + '\n')
(ROOT / 'data/global-catalog-audit.json').write_text(json.dumps({'included': len(rows), 'addedByCategory': counts, 'failedCategories': failed}, ensure_ascii=False, indent=2) + '\n')
print(f'Total: {len(rows)}')
