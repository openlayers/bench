/* eslint-disable no-console */
import BaseTileLayer from 'ol/layer/BaseTile.js';
import BuilderGroup from 'ol/render/canvas/BuilderGroup.js';
import CanvasVectorLayerRenderer from 'ol/renderer/canvas/VectorLayer.js';
import CanvasVectorTileLayerRenderer from 'ol/renderer/canvas/VectorTileLayer.js';
import CompositeMapRenderer from 'ol/renderer/Composite.js';
import ExecutorGroup from 'ol/render/canvas/ExecutorGroup.js';
import GUI from 'lil-gui';
import GeoJSON from 'ol/format/GeoJSON.js';
import Layer from 'ol/layer/Layer.js';
import Link from 'ol/interaction/Link.js';
import Map from 'ol/Map.js';
import MixedGeometryBatch from 'ol/render/webgl/MixedGeometryBatch.js';
import TileGeometry from 'ol/webgl/TileGeometry.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import VectorStyleRenderer from 'ol/render/webgl/VectorStyleRenderer.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import View from 'ol/View.js';
import WebGLVectorLayerRenderer from 'ol/renderer/webgl/VectorLayer.js';
import WebGLVectorTileLayerRenderer from 'ol/renderer/webgl/VectorTileLayer.js';
import {defaults as defaultInteractions} from 'ol/interaction/defaults.js';
import {
  defineFrameContainer,
  showGraph,
  showTable,
  trackPerformance,
  // @ts-ignore
} from '@camptocamp/rendering-analyzer';
import {useGeographic} from 'ol/proj.js';

useGeographic();

const link = new Link();

/** @type {Map} */
let map;

/** @type {function(Map): void} */
let useWebGLCallback;

/** @type {function(Map): void} */
let useCanvasCallback;

/**
 * @param {function(Map): void} useWebGL Called when WebGL is enabled
 * @param {function(Map): void} useCanvas Called when WebGL is disabled
 * @return {Map} Map
 */
export function createMap(useWebGL, useCanvas) {
  map = new Map({
    layers: [],
    target: 'map',
    view: new View({
      center: [0, 0],
      zoom: 4,
      multiWorld: true,
    }),
    interactions: defaultInteractions().extend([link]),
  });
  useWebGLCallback = useWebGL;
  useCanvasCallback = useCanvas;
  return map;
}

/**
 * @extends {Layer<VectorSource, WebGLVectorLayerRenderer>}
 */
export class WebGLVectorLayer extends Layer {
  /**
   * @return {WebGLVectorLayerRenderer} The renderer.
   */
  createRenderer() {
    return new WebGLVectorLayerRenderer(this, {
      style: this.get('style'),
    });
  }
}

/**
 * @extends {BaseTileLayer<import("ol/source/VectorTile.js").default, WebGLVectorTileLayerRenderer>}
 */
export class WebGLVectorTileLayer extends BaseTileLayer {
  createRenderer() {
    return new WebGLVectorTileLayerRenderer(this, {
      style: this.get('style'),
    });
  }
}

const COLOR_PALETTE = [
  '#66c2a5',
  '#fc8d62',
  '#8da0cb',
  '#e78ac3',
  '#a6d854',
  '#ffd92f',
];
export function getRandomColor() {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

const format = new GeoJSON();

/**
 * @param {import('geojson').FeatureCollection} collection Feature collection
 * @param {VectorSource} source Vector source
 */
export function addGeoJsonToSource(collection, source) {
  source.clear();
  console.time('parse features');
  const olFeatures = format.readFeatures(collection);
  console.timeEnd('parse features');

  console.time('add features');
  source.addFeatures(olFeatures);
  console.timeEnd('add features');
}

/**
 * Will generate polygons on a grid covering the whole latitude/longitude range
 * @param {number} count Count of polygons
 * @param {number} numVertices Number of vertices in polygons
 * @return {import('geojson').FeatureCollection} Feature collection
 */
export function generatePolygons(count, numVertices) {
  const size = 400 / Math.floor(Math.sqrt(count / 2)); // Increase the size for larger polygons
  /**
   * @type {Array<import('geojson').Feature>}
   */
  const features = [];
  for (let lon = -180; lon < 180 - size / 4; lon += size) {
    for (let lat = -90; lat < 90 - size / 4; lat += size) {
      const buffer = (0.3 + Math.random() * 0.2) * size; // Increase the buffer for larger polygons

      // Calculate the angle between vertices
      const angleStep = (2 * Math.PI) / numVertices;

      // Generate the vertices of the polygon
      const polygonCoordinates = [];
      for (let i = 0; i < numVertices; i++) {
        const angle = i * angleStep;
        const x =
          lon +
          size / 2 +
          buffer * Math.cos(angle) -
          (Math.random() * size) / 4;
        const y =
          lat +
          size / 2 +
          buffer * Math.sin(angle) -
          (Math.random() * size) / 4;
        polygonCoordinates.push([x, y]);
      }
      // Close the polygon by adding the first vertex at the end
      polygonCoordinates.push(polygonCoordinates[0]);

      features.push({
        type: 'Feature',
        properties: {
          color: getRandomColor(),
          ratio: Math.round(Math.random() * 100),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoordinates],
        },
      });
    }
  }
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * @param {number} count Point count
 * @param {number} radius Radius
 * @return {import('geojson').FeatureCollection} Feature collection
 */
export function generatePoints(count, radius) {
  const size = 400 / Math.floor(Math.sqrt(count / 2));
  /**
   * @type {Array<import('geojson').Feature>}
   */
  const features = [];
  for (let lon = -180; lon < 180 - size / 4; lon += size) {
    for (let lat = -90; lat < 90 - size / 4; lat += size) {
      const buffer = (0.3 + Math.random() * 0.2) * size * (radius / 5); // Increase the buffer for larger points
      features.push({
        type: 'Feature',
        properties: {
          color: getRandomColor(),
          radius,
        },
        geometry: {
          type: 'Point',
          coordinates: [lon + buffer, lat + buffer],
        },
      });
    }
  }
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * @param {number} lineCount From 1 to 100
 * @param {number} curveComplexity From 2 to 1000
 * @param {number} width line width
 * @return {import('geojson').FeatureCollection} Feature collection
 */
export function generateLines(lineCount, curveComplexity, width) {
  /**
   * @type {Array<import('geojson').Feature>}
   */
  const features = [];
  const periodCount = 10;
  const periodWidth = 360 / periodCount;
  const periodHeight = 20;
  const latitudeSpacing = 180 / (lineCount + 1);

  /**
   * @type {Array<any>}
   */
  let singleCurve = []; // Create a singleCurve array outside the loop

  for (let j = 0; j < lineCount; j++) {
    const coordinates = [];
    for (let i = 0; i < periodCount; i++) {
      const startLon = -180 + i * periodWidth;
      const startLat = -90 + (j + 1) * latitudeSpacing;

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
        color: getRandomColor(), // Use deterministic color selection
        width,
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

// GUI Utils

const gui = new GUI();

/** @type {Record<string, boolean|number>} */
const guiParams = {};

/**
 * Registers a GUI param; can either be a numeric parameter with a range, or a toggle parameter
 * The `id` and `values` will show up in the url
 * @param {string} id Id
 * @param {string} label Label
 * @param {Array<string>|Array<number>} values Either two string values for true/false, or two numbers defining a range
 * @param {boolean|number} defaultValue Default value
 * @param {function(boolean|number, boolean): void} callback Called when the parameter changes, and also on initialization
 * First argument is the current value, second argument is true if this is the initial call
 */
export function registerGuiParameter(
  id,
  label,
  values,
  defaultValue,
  callback
) {
  let controller;
  const isNumeric = typeof values[0] === 'number';

  const initialLinkValue = link.track(id, (value) => {
    callback(isNumeric ? parseFloat(value) : value === values[0], false);
  });
  let initialValue = defaultValue;
  if (initialLinkValue !== null) {
    initialValue = isNumeric
      ? parseFloat(initialLinkValue)
      : initialLinkValue === values[0];
  }

  if (isNumeric) {
    guiParams[id] = initialValue;
    const numericValues = /** @type {Array<number>} */ (values);
    controller = gui.add(
      guiParams,
      id,
      numericValues[0],
      numericValues[1],
      numericValues[2] || 1
    );
  } else {
    guiParams[id] = initialValue;
    controller = gui.add(guiParams, id);
  }
  callback(initialValue, true);

  controller.name(label);
  controller.listen();

  if (isNumeric) {
    controller.onFinishChange((/** @type {number} */ rawValue) => {
      link.update(id, rawValue.toString());
      callback(rawValue, false);
    });
  } else {
    controller.onChange((/** @type {boolean} */ rawValue) => {
      const newValue = rawValue ? values[0].toString() : values[1].toString();
      link.update(id, newValue);
      callback(rawValue, false);
    });
  }
}

/**
 * @param {string} id Parameter id
 * @return {number|boolean} Current value
 */
export function getGuiParameterValue(id) {
  return guiParams[id];
}

export function regenerateLayer() {
  map.getLayers().clear();
  if (getGuiParameterValue('renderer') === true) {
    useWebGLCallback(map);
  } else {
    useCanvasCallback(map);
  }
}

/**
 * @param {boolean} useWebGL Track WebGL classes
 */
function enablePerformanceTracking(useWebGL) {
  defineFrameContainer(CompositeMapRenderer, 'renderFrame');
  trackPerformance(VectorSource);
  if (useWebGL) {
    trackPerformance(MixedGeometryBatch);
    trackPerformance(VectorStyleRenderer);
    trackPerformance(WebGLVectorLayerRenderer);
    trackPerformance(TileGeometry);
    trackPerformance(WebGLVectorTileLayerRenderer);
  } else {
    trackPerformance(BuilderGroup);
    trackPerformance(ExecutorGroup);
    trackPerformance(CanvasVectorLayerRenderer);
    trackPerformance(VectorLayer);
    trackPerformance(CanvasVectorTileLayerRenderer);
    trackPerformance(VectorTileLayer);
  }
  showTable();
  showGraph();
  /** @type {HTMLDivElement} */ (gui.domElement).style.right = '430px';
}

export function initializeGui() {
  registerGuiParameter(
    'renderer',
    'Use WebGL',
    ['webgl', 'canvas'],
    false,
    (value, initial) => {
      // if perf tracking is enabled, reloading the page is necessary to monkey-patch the correct classes
      if (getGuiParameterValue('performance') && !initial) {
        location.reload();
        return;
      }
      regenerateLayer();
    }
  );

  registerGuiParameter(
    'performance',
    'Enable Performance Tracking',
    ['yes', 'no'],
    false,
    (value, initial) => {
      if (value && initial) {
        enablePerformanceTracking(getGuiParameterValue('renderer') === true);
      } else if (!initial) {
        location.reload();
      }
    }
  );
}
