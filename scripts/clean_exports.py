#!/usr/bin/env python3
"""Slim down the GeoJSON files exported from QGIS before they go in public/data/.

Usage: python3 scripts/clean_exports.py fires.geojson friendship_centres.geojson highways.geojson

The file type is picked from the file name. Output goes to public/data/ under the standard names.
Only the Python standard library is needed.
"""
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'data'

# Fields the map uses. Everything else (including free-text notes) stays out of the public site.
KEEP = {
    'fires': ['fire_id', 'firename', 'year', 'rep_date', 'out_date', 'size_ha', 'cause'],
    'friendship_centres': ['FC'],
    'highways': [],  # road attributes are internal codes; lines are drawn without a pop-up
}


def strip_z(coords):
    if coords and isinstance(coords[0], (int, float)):
        return [round(c, 5) for c in coords[:2]]
    return [strip_z(c) for c in coords]


def clean(kind, data):
    keep = KEEP[kind]
    for feat in data['features']:
        props = {k: feat['properties'].get(k) for k in keep}
        if 'year' in props and props['year'] is not None:
            props['year'] = int(props['year'])
        if 'size_ha' in props and props['size_ha'] is not None:
            props['size_ha'] = round(props['size_ha'], 1)
        feat['properties'] = {k: v for k, v in props.items() if v is not None}
        feat['geometry']['coordinates'] = strip_z(feat['geometry']['coordinates'])
    data.pop('crs', None)
    return data


def main(paths):
    OUT.mkdir(parents=True, exist_ok=True)
    for path in map(Path, paths):
        kind = next((k for k in KEEP if k in path.name), None)
        if not kind:
            print(f'skipping {path.name}: name must contain one of {", ".join(KEEP)}')
            continue
        data = clean(kind, json.loads(path.read_text(encoding='utf-8')))
        dest = OUT / f'{kind}.geojson'
        dest.write_text(json.dumps(data, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
        print(f'{dest.name}: {len(data["features"])} features, {dest.stat().st_size / 1e6:.2f} MB')


if __name__ == '__main__':
    main(sys.argv[1:])
