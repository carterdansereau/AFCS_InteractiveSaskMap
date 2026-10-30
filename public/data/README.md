# Map data

The app loads these files at startup. Any that are missing are skipped with a notice in the panel.

| File | What it is | Fields the app uses |
| --- | --- | --- |
| `fires.geojson` | Historical wildfire points, 200 ha and larger, 2006–2025 | `year`, `rep_date`, `out_date`, `size_ha`, `firename`, `cause`, `fire_id` |
| `friendship_centres.geojson` | Friendship Centre locations | `FC` (name) |
| `highways.geojson` | Road lines, drawn without a pop-up | none |

Field names are set in `src/config.js`, so a layer with different names only needs that file changed.

## Updating from QGIS

Export each layer with **Export → Save Features As… → GeoJSON**, CRS **EPSG:4326**, then run:

```bash
python3 scripts/clean_exports.py fires.geojson friendship_centres.geojson highways.geojson
```

The script keeps only the fields listed above (so notes and other internal columns never reach the public site), drops the elevation value and writes the files here. It needs only Python 3.
