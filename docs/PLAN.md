# Plan

## Decisions

**MapLibre GL JS instead of Leaflet.** Both would work. MapLibre draws on the GPU, so filtering tens of thousands of fire points by date and size as a slider moves stays smooth, and it has heatmaps, data-driven styling and vector tiles built in. Leaflet would need plugins for each of those and starts to struggle above roughly 10–20k markers. The NFDB has many tens of thousands of Saskatchewan fire records if small fires are included.

**Vite, plain JavaScript, no framework.** Vite gives a dev server with live reload and a one-command production build. A UI framework (React etc.) is not needed for one map and a side panel.

**Static hosting on GitHub Pages, embedded in WordPress with an iframe.** Free, versioned with the code, and keeps the map's JavaScript from clashing with WordPress themes and plugins.

**QGIS stays the place where data is prepared.** The web app only reads exported GeoJSON. Field names live in `src/config.js`.

## CWFIS fire weather (checked 2026-10-29)

- Legacy GeoServer `https://cwfis.cfs.nrcan.gc.ca/geoserver/public/wms` is up. `public:fdr` (fire danger) is time-enabled daily from 2018-01-01; `public:bui`, `public:dc`, `public:dmc`, `public:dsr` from 2024-01-01. `public:fwi` is listed in NRCan's data services guide. Each also has a `_current` variant.
- New CWFIF GeoServer `https://geoserver.cwfif.nrcan.gc.ca/geoserver/wms` is up and serves hourly HRDPS layers such as `public:cffdrs_fwi25_hrdps_hour_fwi`, plus `public:NFDB_point` (fires ≥ 200 ha, 1970–2025). NRCan says all services will move here, so expect to switch the URL in `src/config.js` at some point.
- Active fires (`public:cwfif_national_activefires`, new server) keep every past status update as its own row (190k rows), so the app filters to the current province's rows with `record_end` in the future and no prescribed burns. Satellite hotspots (`public:hotspots_24h`, legacy server) are drawn as a WMS image. See `src/live.js`.
- WMS map images load in the browser without any server of our own. Clicking the raster to read values (GetFeatureInfo) or loading WFS features needs CORS, which is untested.

## Milestones

1. **Starter app (this PR).** Map, layer toggles, fire year range and minimum size filters, play-through, pop-ups, CWFIS fire danger / FWI overlay with a date picker, GitHub Pages deploy.
2. **Real data in.** Export Friendship Centres, fires and highways from QGIS; tune colours, pop-up fields and size classes against the real data. Check the fire file size: under ~10 MB GeoJSON is fine; above that, convert to PMTiles (see below).
3. **Live fire layers.** Active fires and 24 h hotspots from CWFIS, with a "last updated" note.
4. **Indigenous population.** Statistics Canada 2021 Census, Indigenous identity by census subdivision (including reserves), shown as a choropleth: shaded areas with a population or percentage legend. A heatmap blurs points into smooth blobs and would imply people live where they do not, so a choropleth is the more honest view for census data.
5. **Polish.** Fire perimeters (NFDB polygons) when zoomed in, a timeline chart of hectares burned per year, French labels if needed, accessibility pass, WordPress embed.

## Useful tools

- **ogr2ogr** (comes with QGIS): scripted, repeatable conversion from GeoPackage/shapefile to GeoJSON, with field selection and reprojection. See the data files in `public/data/`.
- **mapshaper** (`npm i -g mapshaper` or mapshaper.org): simplify highways and polygons so files stay small without visible loss.
- **tippecanoe + PMTiles**: if the fire or polygon data gets large, tippecanoe turns it into a single `.pmtiles` file that MapLibre reads directly from GitHub Pages, loading only what is on screen.
- **geojson.io**: quick look at an exported file before adding it.
