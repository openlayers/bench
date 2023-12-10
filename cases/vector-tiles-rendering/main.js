/* eslint-disable no-console */
import BaseTileLayer from 'ol/layer/BaseTile.js';
import BuilderGroup from 'ol/render/canvas/BuilderGroup.js';
import CanvasVectorTileLayerRenderer from 'ol/renderer/canvas/VectorTileLayer.js';
import CompositeMapRenderer from 'ol/renderer/Composite.js';
import ExecutorGroup from 'ol/render/canvas/ExecutorGroup.js';
import GUI from 'lil-gui';
import GeoJSON from 'ol/format/GeoJSON.js';
import Link from 'ol/interaction/Link.js';
import Map from 'ol/Map.js';
import MixedGeometryBatch from 'ol/render/webgl/MixedGeometryBatch.js';
import TileGeometry from 'ol/webgl/TileGeometry.js';
import VectorStyleRenderer from 'ol/render/webgl/VectorStyleRenderer.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import VectorTileSource from 'ol/source/VectorTile.js';
import View from 'ol/View.js';
import WebGLVectorTileLayerRenderer from 'ol/renderer/webgl/VectorTileLayer.js';
import {
  defineFrameContainer,
  showGraph,
  showTable,
  trackPerformance,
  // @ts-ignore
} from '@camptocamp/rendering-analyzer';
import {transformExtent, useGeographic} from 'ol/proj.js';

useGeographic();

const map = new Map({
  layers: [],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 0,
  }),
});

const source = new VectorTileSource({
  url: '{z}/{x}/{y}',
  // @ts-ignore
  tileLoadFunction: (tile) => tileLoadFunction(tile),
  maxZoom: 15,
});

const format = new GeoJSON({featureProjection: map.getView().getProjection()});

const colors = ['#6ff05b', '#00AAFF', '#faa91e'];

const gui = new GUI();

const link = new Link();

/**
 *
 * @type {import('ol/style/flat.js').FlatStyle & import('ol/style/webgl.js').WebGLStyle}
 */
const style = {
  'fill-color': ['get', 'color'],
  'stroke-color': ['get', 'color'],
  'stroke-width': 2,
  'circle-radius': 7,
  'circle-fill-color': ['get', 'color'],
  'circle-stroke-color': 'gray',
  'circle-stroke-width': 0.5,
};

const gui_obj = {
  'Use WebGL': false,
  'Feature count': 500,
  'Performance Tracking': false,
};

const useWebGLCheckbox = gui.add(gui_obj, 'Use WebGL');
const featureCountSlider = gui.add(gui_obj, 'Feature count', 500, 10000, 500);
const togglePerformanceTracking = gui.add(gui_obj, 'Performance Tracking');

useWebGLCheckbox.onChange((/** @type {any} */ value) => {
  link.update('renderer', value ? 'webgl' : 'canvas');
  value ? useWebGL() : useCanvas();
  if (gui_obj['Performance Tracking']) {
    location.reload();
  }
});

featureCountSlider.onFinishChange(() => {
  link.update('count', featureCountSlider.getValue());
  source.refresh();
  // workaround required for webgl renderer; see https://github.com/openlayers/openlayers/issues/15213
  // @ts-ignore
  source.setKey(Date.now().toString());
});

togglePerformanceTracking.onChange((/** @type {any} */ value) => {
  link.update('performance', value ? 'yes' : 'no');
  if (value === 'yes') {
    enablePerformanceTracking(gui_obj['Use WebGL']);
  } else {
    location.reload();
  }
});

const initialCount = link.track('count', (newCount) => {
  // workaround required for webgl renderer; see https://github.com/openlayers/openlayers/issues/15213
  // @ts-ignore
  source.setKey(Date.now().toString());
  source.refresh();
});

const initialRenderer = link.track('renderer', (newRenderer) => {
  if (newRenderer === 'webgl') {
    gui_obj['Use WebGL'] = true;
    useWebGLCheckbox.listen();
    useWebGL();
  } else {
    useCanvas();
    gui_obj['Use WebGL'] = false;
    useWebGLCheckbox.listen();
  }
});

const initialPerformance = link.track('performance', (newPerformance) => {
  if (newPerformance === 'yes') {
    gui_obj['Performance Tracking'] = true;
    togglePerformanceTracking.listen();
  } else {
    gui_obj['Performance Tracking'] = false;
    togglePerformanceTracking.listen();
  }
});

map.addInteraction(link);

/**
 * @extends {BaseTileLayer<VectorTileSource, WebGLVectorTileLayerRenderer>}
 */

class WebGLVectorTileLayer extends BaseTileLayer {
  createRenderer() {
    return new WebGLVectorTileLayerRenderer(this, {
      style,
    });
  }
}

function useWebGL() {
  map.getLayers().clear();
  map.addLayer(new WebGLVectorTileLayer({source}));
}

function useCanvas() {
  map.getLayers().clear();
  map.addLayer(
    new VectorTileLayer({
      source,
      // @ts-ignore
      style: style,
    })
  );
}

/**
 * @param {number} numVertices
 * @param {any} bbox
 * @param {any} countPoints
 * @param {number} countPolygons
 * @param {number} countLines
 */

function makeData(countPoints, countPolygons, countLines, numVertices, bbox) {
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
          color: colors[Math.floor(Math.random() * colors.length)],
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
      color: colors[Math.floor(Math.random() * colors.length)],
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
          color: colors[Math.floor(Math.random() * colors.length)],
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
        color: colors[Math.floor(Math.random() * colors.length)],
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
 * @param {import("ol/VectorTile.js").default} tile
 */

function tileLoadFunction(tile) {
  // source.clear();
  const totalFeatureCount = featureCountSlider.getValue();
  const countPoints = Math.floor(totalFeatureCount / 3);
  const countPolygons = Math.floor(totalFeatureCount / 3);
  const countLines = totalFeatureCount - countPoints - countPolygons;
  const tileGrid = source.getTileGrid();
  let extent = tileGrid
    ? tileGrid.getTileCoordExtent(tile.tileCoord)
    : [0, 0, 0, 0];
  extent = transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
  const numVertices = 5;
  const data = makeData(
    countPoints,
    countPolygons,
    countLines,
    numVertices,
    extent
  );
  const features = format.readFeatures(data);
  tile.setFeatures(features);
}

/**
 * @param {any} useWebGL
 */

function enablePerformanceTracking(useWebGL) {
  defineFrameContainer(CompositeMapRenderer, 'renderFrame');
  trackPerformance(VectorTileSource);
  if (useWebGL) {
    trackPerformance(TileGeometry);
    trackPerformance(MixedGeometryBatch);
    trackPerformance(VectorStyleRenderer);
    trackPerformance(WebGLVectorTileLayerRenderer);
  } else {
    trackPerformance(BuilderGroup);
    trackPerformance(ExecutorGroup);
    trackPerformance(CanvasVectorTileLayerRenderer);
    trackPerformance(VectorTileLayer);
  }
  showTable();
  showGraph();
}

function main() {
  gui_obj['Feature count'] = initialCount
    ? parseInt(initialCount)
    : parseInt(featureCountSlider.getValue());
  featureCountSlider.listen();
  gui_obj['Use WebGL'] = initialRenderer === 'webgl';
  useWebGLCheckbox.listen();

  if (initialPerformance === 'yes') {
    gui_obj['Performance Tracking'] = true;
    togglePerformanceTracking.listen();
    enablePerformanceTracking(gui_obj['Use WebGL']);
  } else {
    gui_obj['Performance Tracking'] = false;
    togglePerformanceTracking.listen();
  }

  if (gui_obj['Use WebGL']) {
    useWebGL();
  } else {
    useCanvas();
  }
}

main();
