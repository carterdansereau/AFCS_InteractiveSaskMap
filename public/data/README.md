# Map data

The app loads these files at startup. Any that are missing are skipped with a notice in the panel.

| File | What it is | Fields the app uses |
| --- | --- | --- |
| `fires.geojson` | Historical wildfire points, 200 ha and larger, 2006–2025 | `year`, `rep_date`, `out_date`, `size_ha`, `firename`, `cause`, `fire_id` |
| `friendship_centres.geojson` | Friendship Centre locations | `FC` (name) |
| `highways.geojson` | Road lines, drawn without a pop-up | none |
| `funding.xlsx` | Funding per Friendship Centre per year (Excel) | `Centre`, `Year`, `Amount` on the **Funding** sheet |

These files are now the source of truth; the original QGIS project is no longer used. To fix or add a Friendship Centre, edit `friendship_centres.geojson` directly (coordinates are `[longitude, latitude]`) or ask Claude.

Field names are set in `src/config.js`.

## Updating funding

1. Open `funding.xlsx`, add one row per centre per year on the **Funding** sheet (Centre, Year such as `2024`, Amount in dollars). Rows with a blank Amount are ignored.
2. On GitHub, open `public/data`, choose **Add file → Upload files**, drop in the file (keep the name `funding.xlsx`) and commit to `main`.
3. The live map updates in about 2 minutes. If the deploy fails (red X under **Actions**), its log names the row to fix; the live map keeps the previous funding until then. Names that don't match a centre show as a warning in the map's panel.

The spreadsheet is converted to `funding.json` during the build (`scripts/funding-to-json.mjs`); that file is generated, not committed.
