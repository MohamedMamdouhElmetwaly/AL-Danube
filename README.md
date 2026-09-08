# Al Danube · Riyadh Spatial Viewer

A CesiumJS viewer for the supplied Market AL_DANUBE model at **24.82294972 latitude, 46.65425012 longitude**.

## Run locally

```sh
npm install
npm run dev
```

Open the address printed by the development server. An internet connection is required for satellite imagery, place labels, and search. CesiumJS and Leaflet are served locally; no Cesium ion token is required.

## Controls

- **Place model on map:** click a new ground position; Escape cancels.
- **Arrow buttons:** move exactly one meter east, west, north, or south.
- **Latitude / Longitude:** valid edits apply and save immediately as you type. Incomplete or out-of-range entries retain the last valid position.
- **Rotation:** adjust the heading clockwise around the ground anchor.
- **Ground offset / Overall scale:** adjust elevation above the globe and uniform size. Independent width, depth, and height controls accept meters or sliders. Enable **Keep proportions** to resize the three dimensions together. All dimensions save automatically.
- **Show model:** hide or show the model without changing its placement.
- **3D / 2D:** switch between an oblique globe and a flat top-down map.
- **Imagery:** the main map and circular mini map both use Esri satellite imagery.
- **Search:** search places (biased toward Riyadh) or enter `latitude, longitude`.
- **Focus / target button:** return to the model. North arrow resets camera heading.
- **Places tab:** labels and clickable markers update after the camera stops. Select a marker or list entry for a popup with its name, category, address, coordinates, and available contact details. Up to 50 places are loaded per view; zoom in for more detail. Arabic names are rendered as complete text to preserve letter shaping.
- **Circular satellite mini map:** view center in blue and model position in orange; click it to navigate.
- Placement is automatically saved in browser local storage. **Reset** restores the supplied coordinates, 0° heading, 0.25 m ground offset, and all scales 1.

## Placement and model

The supplied glTF is not georeferenced. Its horizontal bounding-box center is placed at the supplied coordinate; the bottom is normalized to ground level. Source dimensions and orientation are retained, with heading initially 0°. Exact footprint alignment should be adjusted against imagery using the controls. The globe uses WGS 84 ellipsoid ground, not surveyed terrain elevations.

The original geometry was deduplicated, welded, quantized, and compressed with Meshopt, retaining all scene objects and textures. Geometry is split across static files under the hosting size limit. Prepared model assets are included in `public/models`, so model preprocessing is not needed to run the app.

To regenerate, extract the original archive to `../model-source`, then run `node scripts/prepare-model.mjs`. Check it with `node scripts/validate-model.mjs`.

## Validation

```sh
npx tsc --noEmit
npx oxlint app scripts components/ui/slider.tsx components/ui/switch.tsx
node scripts/validate-model.mjs
npm run build
```

The scaffold's full `npm run lint` currently also reports pre-existing issues in unused generated UI components. Application checks can be run with the scoped command above.

## Sources and attribution

- Model: Market AL_DANUBE by sherif shawky. See `public/models/license.txt` for the supplied Sketchfab Standard license and source link.
- Globe: CesiumJS 1.133.0, https://cesium.com/learn/cesiumjs/ref-doc/.
- Satellite imagery: Esri World Imagery, with provider credits shown in the viewer.
- Overview imagery: Esri World Imagery.
- Place search and nearby POIs: ArcGIS World Geocoding Service. Text queries are sent on submission; nearby places are requested for the current extent after map movements. Place responses are not stored in browser persistence.

