# Map data

The app loads these files at startup. Any that are missing are skipped with a notice in the panel.

| File | What it is | Fields the app uses |
| --- | --- | --- |
| `fires.geojson` | Historical wildfire points, 200 ha and larger, 2006–2025 | `year`, `rep_date`, `out_date`, `size_ha`, `firename`, `cause`, `fire_id` |
| `friendship_centres.geojson` | Friendship Centre locations | `FC` (name) |
| `highways.geojson` | Road lines, drawn without a pop-up | none |

These files are now the source of truth; the original QGIS project is no longer used. To fix or add a Friendship Centre, edit `friendship_centres.geojson` directly (coordinates are `[longitude, latitude]`) or ask Claude.

Field names are set in `src/config.js`.
