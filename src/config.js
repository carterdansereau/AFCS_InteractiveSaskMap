// Everything that depends on the data lives here, so swapping a QGIS export
// or a CWFIS layer name should not require touching the rest of the app.

export const MAP = {
  center: [-105.9, 54.5],
  zoom: 4.6,
  // Roughly the Saskatchewan border, with some padding.
  maxBounds: [[-116, 47], [-95, 61.5]],
  // OpenFreeMap: free vector basemap, no API key.
  basemap: 'https://tiles.openfreemap.org/styles/positron',
};

// Field names match the National Fire Database (NFDB) point layer.
// If your QGIS export renamed fields, change them here.
export const FIRES = {
  url: 'data/fires.geojson',
  fields: {
    year: 'YEAR',
    reported: 'REP_DATE',
    out: 'OUT_DATE',
    size: 'SIZE_HA',
    name: 'FIRENAME',
    cause: 'CAUSE',
    id: 'FIRE_ID',
  },
  // Breaks (hectares) used for both circle size and colour.
  sizeClasses: [
    { min: 0, label: '< 10 ha', color: '#fdd49e', radius: 2 },
    { min: 10, label: '10–200 ha', color: '#fc8d59', radius: 3.5 },
    { min: 200, label: '200–1,000 ha', color: '#ef6548', radius: 5 },
    { min: 1000, label: '1,000–10,000 ha', color: '#d7301f', radius: 7 },
    { min: 10000, label: '≥ 10,000 ha', color: '#7f0000', radius: 10 },
  ],
};

export const VECTOR_LAYERS = [
  {
    id: 'friendship-centres',
    label: 'Friendship Centres',
    url: 'data/friendship_centres.geojson',
    type: 'circle',
    paint: {
      'circle-radius': 7,
      'circle-color': '#1f5fa8',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
    labelField: 'name',
    visible: true,
  },
  {
    id: 'highways',
    label: 'Highways',
    url: 'data/highways.geojson',
    type: 'line',
    paint: { 'line-color': '#555', 'line-width': 1.2 },
    visible: true,
  },
  // Planned: Indigenous population by census subdivision (choropleth).
];

// CWFIS GeoServer WMS. Checked 2026-10-29: the legacy server still serves the
// public:fwi / public:fdr layers with a daily TIME dimension. NRCan is moving
// layers to geoserver.cwfif.nrcan.gc.ca, so this is the one place to update.
export const WEATHER = {
  wmsUrl: 'https://cwfis.cfs.nrcan.gc.ca/geoserver/public/wms',
  layers: [
    { id: 'none', label: 'Off' },
    { id: 'public:fdr', label: 'Fire Danger' },
    { id: 'public:fwi', label: 'Fire Weather Index (FWI)' },
    { id: 'public:bui', label: 'Buildup Index' },
    { id: 'public:dc', label: 'Drought Code' },
  ],
  defaultLayer: 'public:fdr',
  opacity: 0.6,
};
