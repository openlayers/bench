import GeoJSON from 'ol/format/GeoJSON.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import {transformExtent} from 'ol/proj.js';
import VectorTileSource from 'ol/source/VectorTile.js';
import {compareVersions} from 'ol/string.js';
import {
  WebGLVectorTileLayer,
  createMap,
  getGuiParameterValue,
  getRandomColor,
  initializeGui,
  olVersion,
  regenerateLayer,
  registerGuiParameter,
} from '../common.js';

const source = new VectorTileSource({
  url: '{z}/{x}/{y}',
  // @ts-ignore
  tileLoadFunction: (tile) => tileLoadFunction(tile),
  maxZoom: 15,
});

const format = new GeoJSON({featureProjection: 'EPSG:3857'});

const defaultStylesCount = 10;

/**
 * @type {function(): Array<import('ol/style/flat.js').Rule>|import('ol/style/flat.js').FlatStyle}
 */
function generateStyle() {
  const totalStylesCount =
    /** @type {number} */ (getGuiParameterValue('styleCount')) ??
    defaultStylesCount;

  // use a single style rule for OpenLayers versions < 10.4.1
  if (olVersion.match(/^[0-9]/) && compareVersions(olVersion, '10.4.1') < 0) {
    const colorExpr = [
      'match',
      ['get', 'propValue'],
      ...new Array(totalStylesCount)
        .fill(0)
        .map((_, i) => i)
        .map((i) => [i, getRandomColor()])
        .flat(),
      '#333',
    ];
    return {
      'fill-color': colorExpr,
      'stroke-color': [
        'match',
        ['geometry-type'],
        'LineString',
        colorExpr,
        '#333',
      ],
      'stroke-width': 2,
      'circle-radius': 7,
      'circle-fill-color': colorExpr,
      'circle-stroke-color': '#333',
      'circle-stroke-width': 2,
    };
  }
  return new Array(totalStylesCount).fill(0).map((_, i) => {
    const color = getRandomColor();
    return {
      style: {
        'fill-color': color,
        'stroke-color': [
          'match',
          ['geometry-type'],
          'LineString',
          color,
          '#333',
        ],
        'stroke-width': 2,
        'circle-radius': 7,
        'circle-fill-color': color,
        'circle-stroke-color': '#333',
        'circle-stroke-width': 2,
      },
      filter: ['==', ['get', 'propValue'], i],
    };
  });
}

/**
 * @param {number} countPoints Points count
 * @param {number} countPolygons Polygons count
 * @param {number} countLines Lines count
 * @param {number} numVertices Amount of vertices in polygons
 * @param {Array<number>} propValues Property values to choose from
 * @param {Array<number>} bbox Bounding box
 * @return {import('geojson').FeatureCollection} Feature collection
 */
function makeData(
  countPoints,
  countPolygons,
  countLines,
  numVertices,
  propValues,
  bbox,
) {
  /**
   * @type {Array<import('geojson').Feature>}
   */
  const features = [];
  const width = bbox[2] - bbox[0];
  const height = bbox[3] - bbox[1];
  const centerLon = bbox[0] + width / 2;
  const centerLat = bbox[1] + height / 2;

  // Calculate the size based on the count and the bounding box area
  const gridSpacing =
    (width + height) / 4 / (Math.ceil(Math.sqrt(countPoints)) + 1);

  // Generate polygons on the left bottom corner
  for (let lon = bbox[0] + gridSpacing; lon < centerLon; lon += gridSpacing) {
    for (let lat = bbox[1] + gridSpacing; lat < centerLat; lat += gridSpacing) {
      const buffer = (0.3 + Math.random() * 0.2) * gridSpacing;

      const angleStep = (2 * Math.PI) / numVertices;

      const polygonCoordinates = [];
      for (let i = 0; i < numVertices; i++) {
        const angle = i * angleStep;
        const x = lon + buffer * Math.cos(angle);
        const y = lat + buffer * Math.sin(angle);
        polygonCoordinates.push([x, y]);
      }
      polygonCoordinates.push(polygonCoordinates[0]);

      features.push({
        type: 'Feature',
        properties: {
          propValue: propValues[Math.floor(Math.random() * propValues.length)],
        },
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoordinates],
        },
      });
    }
  }

  // outer boundary
  features.push({
    type: 'Feature',
    properties: {
      propValue: propValues[Math.floor(Math.random() * propValues.length)],
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[1]],
        [bbox[2], bbox[3]],
        [bbox[0], bbox[3]],
        [bbox[0], bbox[1]],
      ],
    },
  });

  // Generate points on the right top corner
  for (let lon = centerLon + gridSpacing; lon < bbox[2]; lon += gridSpacing) {
    for (let lat = bbox[1] + gridSpacing; lat < centerLat; lat += gridSpacing) {
      const point = [lon, lat];

      features.push({
        type: 'Feature',
        properties: {
          propValue: propValues[Math.floor(Math.random() * propValues.length)],
        },
        geometry: {
          type: 'Point',
          coordinates: point,
        },
      });
    }
  }

  const curveComplexity = 2;
  const periodCount = 6;
  const periodWidth = (width - gridSpacing * 2) / periodCount;
  const periodHeight = height / 20;
  const latitudeSpacing = (height / 2 - periodHeight * 2) / countLines;

  /**
   * @type {Array<any>}
   */
  let singleCurve = []; // Create a singleCurve array outside the loop

  for (let j = 0; j < countLines; j++) {
    const coordinates = [];
    for (let i = 0; i < periodCount; i++) {
      const startLon = bbox[0] + i * periodWidth + gridSpacing;
      const startLat = centerLat + periodHeight + j * latitudeSpacing; // Change the starting latitude to be above the center

      singleCurve = []; // Clear the array

      for (let i = 0; i < curveComplexity; i++) {
        const ratio = i / curveComplexity;
        const longitude = startLon + ratio * periodWidth;
        const latitude =
          startLat + Math.cos(ratio * Math.PI * 2) * periodHeight * 0.5;
        singleCurve = singleCurve.concat([[longitude, latitude]]);
      }
      coordinates.push(...singleCurve);
    }

    features.push({
      type: 'Feature',
      properties: {
        propValue: propValues[Math.floor(Math.random() * propValues.length)],
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * @param {import("ol/VectorTile.js").default<*>} tile Vector tile
 */
function tileLoadFunction(tile) {
  const totalFeatureCount = /** @type {number} */ (
    getGuiParameterValue('count')
  );
  const countPoints = Math.floor(totalFeatureCount / 3);
  const countPolygons = Math.floor(totalFeatureCount / 3);
  const countLines = totalFeatureCount - countPoints - countPolygons;
  const tileGrid = source.getTileGrid();
  let extent = tileGrid
    ? tileGrid.getTileCoordExtent(tile.tileCoord)
    : [0, 0, 0, 0];
  extent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
  const numVertices = 5;
  const totalStylesCount = /** @type {number} */ (
    getGuiParameterValue('styleCount')
  );
  const propValues = new Array(totalStylesCount).fill(0).map((_, i) => i);
  const data = makeData(
    countPoints,
    countPolygons,
    countLines,
    numVertices,
    propValues,
    extent,
  );
  const features = format.readFeatures(data);
  tile.setFeatures(features);
}

function main() {
  createMap(
    (map) => {
      map.addLayer(
        new WebGLVectorTileLayer({
          source,
          properties: {style: generateStyle()},
        }),
      );
    },
    (map) => {
      map.addLayer(
        new VectorTileLayer({
          source,
          // @ts-ignore
          style: generateStyle(),
        }),
      );
    },
  );
  initializeGui();
  registerGuiParameter(
    'count',
    'Feature count',
    [500, 10000],
    500,
    (value, initial) => {
      if (initial) {
        return;
      }
      regenerateLayer();
      source.refresh();
      // workaround required for webgl renderer; see https://github.com/openlayers/openlayers/issues/15213
      // @ts-ignore
      source.setKey(Date.now().toString());
    },
  );
  registerGuiParameter(
    'styleCount',
    'Style layers count',
    [1, 500],
    defaultStylesCount,
    (value, initial) => {
      if (initial) {
        return;
      }
      regenerateLayer();
      source.refresh();
      // workaround required for webgl renderer; see https://github.com/openlayers/openlayers/issues/15213
      // @ts-ignore
      source.setKey(Date.now().toString());
    },
  );
}

main();
