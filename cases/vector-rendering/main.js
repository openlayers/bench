/* eslint-disable no-console */
import GeoJSON from 'ol/format/GeoJSON.js';
import Layer from 'ol/layer/Layer.js';
import Link from 'ol/interaction/Link.js';
import Map from 'ol/Map.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import View from 'ol/View.js';
import WebGLVectorLayerRenderer from 'ol/renderer/webgl/VectorLayer.js';
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

const style = {
  'fill-color': ['get', 'color'],
  'stroke-color': 'gray',
  'stroke-width': 0.5,
};

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

const link = new Link();

const webglToggle = /** @type {HTMLInputElement} */ (
  document.getElementById('renderer')
);
webglToggle.addEventListener('change', function () {
  if (webglToggle.checked) {
    link.update('renderer', 'webgl');
    useWebGL();
  } else {
    link.update('renderer', 'canvas');
    useCanvas();
  }
});

const initialRenderer = link.track('renderer', (newRenderer) => {
  if (newRenderer === 'webgl') {
    webglToggle.checked = true;
    useWebGL();
  } else {
    webglToggle.checked = false;
    useCanvas();
  }
});
webglToggle.checked = initialRenderer === 'webgl';

const countSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById('count')
);
countSelect.addEventListener('change', function () {
  link.update('count', countSelect.value);
  resetData(parseInt(countSelect.value));
});

const initialCount = link.track('count', (newCount) => {
  resetData(parseInt(newCount));
});
if (initialCount) {
  countSelect.value = initialCount;
}

map.addInteraction(link);

/**
 * @param {number} count The number of features to create.
 * @return {import('geojson').FeatureCollection} The features.
 */
function makeData(count) {
  const size = 180 / Math.floor(Math.sqrt(count / 2));
  /**
   * @type {Array<import('geojson').Feature>}
   */
  const features = [];
  for (let lon = -180; lon < 180 - size / 4; lon += size) {
    for (let lat = -90; lat < 90 - size / 4; lat += size) {
      const buffer = (0.1 + Math.random() * 0.1) * size;
      features.push({
        type: 'Feature',
        properties: {
          color: colors[Math.floor(Math.random() * colors.length)],
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lon + buffer, lat + buffer],
              [lon + size - buffer, lat + buffer],
              [lon + size - buffer, lat + size - buffer],
              [lon + buffer, lat + size - buffer],
              [lon + buffer, lat + buffer],
            ],
          ],
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
 * @param {import('geojson').FeatureCollection} data The GeoJSON data.
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
}

function main() {
  const count = initialCount
    ? parseInt(initialCount)
    : parseInt(countSelect.value);
  resetData(count);

  if (initialRenderer === 'webgl') {
    useWebGL();
  } else {
    useCanvas();
  }
}

main();
