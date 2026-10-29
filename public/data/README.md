# Map data

The app loads these files at startup. Any that are missing are skipped with a notice in the panel.

| File | What it is | Fields the app uses |
| --- | --- | --- |
| `fires.geojson` | Historical wildfire points (NFDB) | `YEAR`, `REP_DATE`, `OUT_DATE`, `SIZE_HA`, `FIRENAME`, `CAUSE`, `FIRE_ID` |
| `friendship_centres.geojson` | Friendship Centre locations | `name` (label); every field shows in the pop-up |
| `highways.geojson` | Highway lines | none |

Field names are set in `src/config.js`, so a layer with different names only needs that file changed.

Export from QGIS with **Export → Save Features As… → GeoJSON**, CRS **EPSG:4326**, or put GeoPackages in `raw/` and run `scripts/prepare-data.sh`.
