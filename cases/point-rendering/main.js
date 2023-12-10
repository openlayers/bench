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
 * @type {import('ol/style/flat.js').FlatStyle & import('ol/style/webgl.js').WebGLStyle}
 */
const style = {
  // This has to be fixed upstream
  // @ts-ignore
  'circle-radius': ['get', 'radius'],
  'circle-fill-color': ['get', 'color'],
  'circle-stroke-color': 'gray',
  'circle-stroke-width': 0.5,
};

const gui_obj = {
  'Feature count': 200000,
  'Use WebGL': false,
  'Radius': 4,
  'Performance Tracking': false,
};

const useWebGLCheckbox = gui.add(gui_obj, 'Use WebGL');
const featureCountSlider = gui.add(gui_obj, 'Feature count', 100000, 500000);
const radiusMeasure = gui.add(gui_obj, 'Radius', 4, 40, 1);
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
  resetData(parseInt(featureCountSlider.getValue()), gui_obj.Radius);
});

radiusMeasure.onFinishChange(() => {
  link.update('radius', radiusMeasure.getValue());
  resetData(gui_obj['Feature count'], gui_obj.Radius);
});

togglePerformanceTracking.onChange((/** @type {any} */ value) => {
  link.update('performance', value ? 'yes' : 'no');
  if (value === 'yes') {
    enablePerformanceTracking(gui_obj['Use WebGL']);
  } else {
    location.reload();
  }
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
  resetData(parseInt(newCount), parseInt(radiusMeasure.getValue()));
});

const initialRadius = link.track('radius', (newRadius) => {
  resetData(parseInt(featureCountSlider.getValue()), parseInt(newRadius));
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
  map.addLayer(new VectorLayer({source, style}));
}

/**
 * @param {number} count
 * @param {number} radius
 */

function makeData(count, radius) {
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
          color: colors[Math.floor(Math.random() * colors.length)],
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
 * @param {number} numVertices
 */

function resetData(count, numVertices) {
  source.clear();
  const data = makeData(count, numVertices);
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

function main() {
  const count = initialCount
    ? parseInt(initialCount)
    : parseInt(featureCountSlider.getValue());
  const radius = initialRadius
    ? parseInt(initialRadius)
    : parseInt(radiusMeasure.getValue());

  resetData(count, radius);

  gui_obj['Feature count'] = count;
  gui_obj.Radius = radius;
  featureCountSlider.listen();
  radiusMeasure.listen();

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
