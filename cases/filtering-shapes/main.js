/* eslint-disable no-console */
import BuilderGroup from 'ol/render/canvas/BuilderGroup.js';
import CanvasVectorLayerRenderer from 'ol/renderer/canvas/VectorLayer.js';
import CompositeMapRenderer from 'ol/renderer/Composite.js';
import ExecutorGroup from 'ol/render/canvas/ExecutorGroup.js';
import GUI from 'lil-gui';
import GeoJSON from 'ol/format/GeoJSON.js';
import Layer from 'ol/layer/Layer.js';
import Link from 'ol/interaction/Link.js';
import Map from 'ol/Map.js';
import MixedGeometryBatch from 'ol/render/webgl/MixedGeometryBatch.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import VectorStyleRenderer from 'ol/render/webgl/VectorStyleRenderer.js';
import View from 'ol/View.js';
import WebGLVectorLayerRenderer from 'ol/renderer/webgl/VectorLayer.js';
import {
  defineFrameContainer,
  showGraph,
  showTable,
  trackPerformance,
  // @ts-ignore
} from '@camptocamp/rendering-analyzer';
import {useGeographic} from 'ol/proj.js';

useGeographic();

const map = new Map({
  layers: [],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 4,
  }),
});

const source = new VectorSource();

const colors = ['#6ff05b', '#00AAFF', '#faa91e'];

const gui = new GUI();

const link = new Link();

/**
 *
 * @type {import('ol/style/flat.js').FlatStyle & import('ol/style/webgl.js').WebGLStyle}
 */
const style = {
  'fill-color': ['get', 'color'],
  'stroke-color': 'gray',
  'stroke-width': 0.5,
  filter: ['>', ['get', 'number'], 0],
};

const gui_obj = {
  'Feature count': 200000,
  'Use WebGL': false,
  'Outline': true,
  'Filter Value': 0,
  'Performance Tracking': false,
};

const useWebGLCheckbox = gui.add(gui_obj, 'Use WebGL');
const featureCountSlider = gui.add(gui_obj, 'Feature count', 100000, 500000);
const filterValueSlider = gui.add(gui_obj, 'Filter Value', 0, 10, 1);
const togglePerformanceTracking = gui.add(gui_obj, 'Performance Tracking');

useWebGLCheckbox.onChange((/** @type {boolean} */ value) => {
  if (value) {
    link.update('renderer', 'webgl');
    useWebGL();
  } else {
    link.update('renderer', 'canvas');
    useCanvas();
  }
  if (gui_obj['Performance Tracking']) {
    location.reload();
  }
});

featureCountSlider.onFinishChange(() => {
  link.update('count', featureCountSlider.getValue());
  resetData(parseInt(featureCountSlider.getValue()));
});

togglePerformanceTracking.onChange((/** @type {any} */ value) => {
  link.update('performance', value ? 'yes' : 'no');
  if (value === 'yes') {
    enablePerformanceTracking(gui_obj['Use WebGL']);
  } else {
    location.reload();
  }
});

filterValueSlider.onFinishChange((/** @type {any} */ value) => {
  link.update('filterValue', value);
  applyFilter(parseInt(value));
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

const initialCount = link.track('count', (newCount) => {
  resetData(parseInt(newCount));
});

const initialFilterValue = link.track('filterValue', (newFilterValue) => {
  gui_obj['Filter Value'] = parseInt(newFilterValue);
  applyFilter(parseInt(newFilterValue));
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

class WebGLLayer extends Layer {
  /**
   * @return {WebGLVectorLayerRenderer} The renderer.
   */
  createRenderer() {
    return new WebGLVectorLayerRenderer(this, {
      style,
    });
  }
}

function useWebGL() {
  map.getLayers().clear();
  map.addLayer(new WebGLLayer({source}));
}

function useCanvas() {
  map.getLayers().clear();
  map.addLayer(
    new VectorLayer({
      source,
      style: [
        {
          filter: style.filter,
          style,
        },
      ],
    })
  );
}

/**
 * @param {number} count
 */

function makeData(count) {
  const size = 400 / Math.floor(Math.sqrt(count / 2)); // Increase the size for larger polygons
  const numVertices = 4;
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
        const x = lon + size / 2 + buffer * Math.cos(angle);
        const y = lat + size / 2 + buffer * Math.sin(angle);
        polygonCoordinates.push([x, y]);
      }
      // Close the polygon by adding the first vertex at the end
      polygonCoordinates.push(polygonCoordinates[0]);

      features.push({
        type: 'Feature',
        properties: {
          color: colors[Math.floor(Math.random() * colors.length)],
          number: Math.floor(Math.random() * 10) + 1,
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

const format = new GeoJSON();
/**
 * @param {{features: Array<import('geojson').Feature>, type: string}} data The GeoJSON data.
 * @return {Array<import('ol/Feature.js').default>} The features.
 */
function parseFeatures(data) {
  console.time('parse features');
  const features = format.readFeatures(data);
  console.timeEnd('parse features');
  return features;
}

/**
 * @param {Array<import('ol/Feature.js').default>} features The features.
 */
async function addFeatures(features) {
  console.time('add features');
  source.addFeatures(features);
  console.timeEnd('add features');
}

/**
 * @param {number} count The number of features to create.
 */

function resetData(count) {
  source.clear();
  const data = makeData(count);
  const features = parseFeatures(data);
  addFeatures(features);
  console.time('first render');
}

/**
 * @param {boolean} useWebGL
 */

function enablePerformanceTracking(useWebGL) {
  defineFrameContainer(CompositeMapRenderer, 'renderFrame');
  trackPerformance(VectorSource);
  if (useWebGL) {
    trackPerformance(MixedGeometryBatch);
    trackPerformance(VectorStyleRenderer);
    trackPerformance(WebGLVectorLayerRenderer);
  } else {
    trackPerformance(BuilderGroup);
    trackPerformance(ExecutorGroup);
    trackPerformance(CanvasVectorLayerRenderer);
    trackPerformance(VectorLayer);
  }
  showTable();
  showGraph();
}

/**
 * @param {any} filterValue
 */

function applyFilter(filterValue) {
  style.filter = ['>', ['get', 'number'], filterValue];
  resetData(featureCountSlider.getValue());
  if (gui_obj['Use WebGL']) {
    useWebGL();
  } else {
    useCanvas();
  }
}

function main() {
  const count = initialCount
    ? parseInt(initialCount)
    : parseInt(featureCountSlider.getValue());
  const filterValue = initialFilterValue
    ? parseInt(initialFilterValue)
    : parseInt(filterValueSlider.getValue());

  gui_obj['Filter Value'] = filterValue;
  applyFilter(filterValue);
  filterValueSlider.listen();
  gui_obj['Feature count'] = count;
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
