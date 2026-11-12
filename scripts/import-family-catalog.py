#!/usr/bin/env python3
"""Refresh the supplementary Wikipedia SUV and sedan snapshot (requires bs4)."""
import hashlib
import json
import re
import time
from pathlib import Path
from urllib.parse import quote, urlencode, urljoin
from bs4 import BeautifulSoup
import requests

ROOT = Path(__file__).resolve().parents[1]
UA = 'Mozilla/5.0 (compatible; EmberGarageCatalog/1.0; educational local game)'
SUV_URL = 'https://en.wikipedia.org/wiki/List_of_sport_utility_vehicles'
API = 'https://en.wikipedia.org/w/api.php'

def fetch(url):
    response = requests.get(url, headers={'User-Agent': UA}, timeout=40)
    response.raise_for_status()
    return response.text

def clean(text):
    return re.sub(r'\s+', ' ', re.sub(r'\[\d+\]', '', text)).strip()

def normalize(text):
    return re.sub(r'[^a-z0-9]+', '', text.lower())

def entry(brand, model, years, category, source, styles='', country=''):
    year = re.search(r'\b(18\d\d|19\d\d|20\d\d)\b', years)
    key = f'{brand}|{model}|{category}'
    return {'id': 'family-' + hashlib.sha256(key.encode()).hexdigest()[:16],
            'brand': brand, 'model': model, 'years': years or '年代未核实',
            'year': int(year.group()) if year else None, 'styles': styles or category,
            'country': country, 'concept': False, 'source': source, 'vehicleClass': category}

old = json.loads((ROOT / 'data/vehicle-catalog.json').read_text())
known = {(normalize(r['brand']), normalize(r['model'])) for r in old}
soup = BeautifulSoup(fetch(SUV_URL), 'html.parser')
tables = soup.select('table.wikitable')
assert len(tables) >= 3
rows, brands, skipped = [], {r['brand'] for r in old}, 0
for table in (tables[0], tables[2]):
    for row in table.select('tr')[1:]:
        cells = row.find_all('td', recursive=False)
        if len(cells) < 6:
            skipped += 1
            continue
        brand, model, category, country, years = [clean(cells[i].get_text(' ', strip=True)) for i in (0, 1, 3, 4, 5)]
        if not brand or not model or not re.search(r'[A-Za-z0-9]', model):
            skipped += 1
            continue
        first_year = re.search(r'\b(18\d\d|19\d\d|20\d\d)\b', years)
        if first_year and int(first_year.group()) > 2026:
            skipped += 1
            continue
        link = cells[1].find('a', href=re.compile(r'^/wiki/'))
        source = urljoin('https://en.wikipedia.org', link['href']) if link else SUV_URL
        text = f'{brand} {model} {category}'
        offroad = bool(re.search(r'off.?road|jeep|wrangler|land cruiser|defender|bronco|jimny|patrol|land rover|tank 300|tank 500|grenadier|fj cruiser|g.class|hummer', text, re.I))
        item = entry(brand, model, years, 'offroad' if offroad else 'suv', source, category, country)
        key = (normalize(brand), normalize(model))
        if key in known:
            skipped += 1
            continue
        known.add(key); brands.add(brand); rows.append(item)

# Category pages identify sedan nameplates, but usually do not include production years.
brands.update(['Acura', 'Alfa Romeo', 'Audi', 'BMW', 'Buick', 'BYD', 'Cadillac', 'Chevrolet', 'Chrysler', 'Citroën', 'Dodge', 'Fiat', 'Ford', 'Genesis', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar', 'Kia', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Plymouth', 'Pontiac', 'Renault', 'Saab', 'Saturn', 'Škoda', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'])
brands = sorted(brands, key=len, reverse=True)
titles = []
for category in ('Category:Sedans', 'Category:Sports sedans'):
    params = {'action':'query', 'list':'categorymembers', 'cmtitle':category, 'cmtype':'page', 'cmlimit':'500', 'format':'json'}
    while True:
        data = json.loads(fetch(API + '?' + urlencode(params)))
        titles.extend(item['title'] for item in data['query']['categorymembers'])
        if 'continue' not in data:
            break
        params.update(data['continue']); time.sleep(.2)
for title in titles:
    brand = next((b for b in brands if title.casefold().startswith(b.casefold() + ' ')), None)
    if not brand:
        skipped += 1
        continue
    model = re.sub(r'\s*\((?:automobile|car)\)$', '', title[len(brand):].strip(), flags=re.I)
    key = (normalize(brand), normalize(model))
    if not model or key in known:
        skipped += 1
        continue
    known.add(key)
    rows.append(entry(brand, model, '', 'sedan', 'https://en.wikipedia.org/wiki/' + quote(title.replace(' ', '_')), 'Sedan'))

rows.sort(key=lambda r: (r['brand'].casefold(), r['model'].casefold()))
audit = {'source': SUV_URL, 'sedanSources':['https://en.wikipedia.org/wiki/Category:Sedans','https://en.wikipedia.org/wiki/Category:Sports_sedans'], 'retrieved':'2026-11-07',
         'suvTableRows':sum(len(t.select('tr'))-1 for t in (tables[0],tables[2])), 'sedanCategoryPages':len(titles),
         'included':len(rows), 'classes':{c:sum(r['vehicleClass']==c for r in rows) for c in ('sedan','suv','offroad')}, 'skipped':skipped}
(ROOT/'data/family-catalog.json').write_text(json.dumps(rows, ensure_ascii=False, separators=(',',':'))+'\n')
(ROOT/'data/family-catalog-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(audit,ensure_ascii=False))
