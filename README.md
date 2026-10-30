# AFCS Interactive Saskatchewan Map

An interactive web map of Saskatchewan showing Friendship Centres, historical wildfires (filterable by year range and size, with a play-through timeline), highways, and live fire weather from the Canadian Wildland Fire Information System (CWFIS).

Built with [MapLibre GL JS](https://maplibre.org/) and [Vite](https://vite.dev/). No backend: the data is static GeoJSON in `public/data/`, and fire weather is loaded straight from NRCan's map service.

## Run it locally

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev      # opens a local server that reloads on save
npm run build    # writes the site to dist/
```

## Add your data

The map data lives in `public/data/` as GeoJSON files. See [`public/data/README.md`](public/data/README.md) for the files and fields.

## Where things live

| File | Purpose |
| --- | --- |
| `src/config.js` | Data file paths, field names, colours, size classes, CWFIS layers. Most changes start here. |
| `src/fires.js` | Wildfire layer, date and size sliders, play button |
| `src/weather.js` | CWFIS fire weather overlay (WMS) and date picker |
| `src/main.js` | Map setup, other layers, layer toggles |
| `docs/PLAN.md` | Roadmap and design decisions |

## Publishing

Pushing to `main` builds the site and publishes it with GitHub Pages (enable it once under **Settings → Pages → Source: GitHub Actions**). To show it on the WordPress site, add a Custom HTML block:

```html
<iframe src="https://carterdansereau.github.io/AFCS_InteractiveSaskMap/"
        style="width:100%;height:80vh;border:0" title="Saskatchewan wildfire map"
        loading="lazy" allow="fullscreen"></iframe>
```

## Data sources

- Historical fires: Canadian National Fire Database (NFDB), Natural Resources Canada
- Fire weather and fire danger: CWFIS, Natural Resources Canada (`public:fdr`, `public:fwi` and related WMS layers)
- Basemap: © OpenStreetMap contributors, via OpenFreeMap
