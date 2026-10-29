#!/usr/bin/env bash
# Convert QGIS exports in raw/ into small, web-ready GeoJSON in public/data/.
# Needs GDAL (ogr2ogr), which ships with QGIS. On Windows, run this from the
# "OSGeo4W Shell" that QGIS installs. mapshaper (npm i -g mapshaper) is optional
# and only used to shrink the highways file.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/data

# EPSG:4326 (lon/lat) is what web maps expect; 5 decimals is ~1 m precision.
common=(-f GeoJSON -t_srs EPSG:4326 -lco COORDINATE_PRECISION=5 -lco RFC7946=YES)

# Historical fires: keep only the fields the map uses, and only Saskatchewan.
# Drop the -where line if your layer is already clipped to Saskatchewan.
ogr2ogr "${common[@]}" public/data/fires.geojson raw/fires.gpkg \
  -select FIRE_ID,FIRENAME,YEAR,REP_DATE,OUT_DATE,SIZE_HA,CAUSE \
  -where "SRC_AGENCY = 'SK'"

ogr2ogr "${common[@]}" public/data/friendship_centres.geojson raw/friendship_centres.gpkg

if command -v mapshaper >/dev/null; then
  ogr2ogr "${common[@]}" /tmp/highways.geojson raw/highways.gpkg
  mapshaper /tmp/highways.geojson -simplify 10% keep-shapes -o public/data/highways.geojson
else
  ogr2ogr "${common[@]}" -simplify 0.0005 public/data/highways.geojson raw/highways.gpkg
fi

ls -lh public/data/*.geojson
