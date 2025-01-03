import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import WebGLVectorLayer from 'ol/layer/WebGLVector.js';
import {
  addGeoJsonToSource,
  createMap,
  generatePoints,
  getGuiParameterValue,
  initializeGui,
  registerGuiParameter,
} from '../common.js';

const source = new VectorSource({
  wrapX: false,
});

/**
 * @type {import('ol/style/flat.js').FlatStyle}
 */
const style = {
  // This has to be fixed upstream
  // @ts-ignore
  'circle-radius': ['get', 'radius'],
  'circle-fill-color': ['get', 'color'],
  'circle-stroke-color': 'gray',
  'circle-stroke-width': 0.5,
};

/**
 * @param {number} count The number of features to create.
 * @param {number} radius
 */

function resetData(count, radius) {
  addGeoJsonToSource(generatePoints(count, radius), source);
}

function main() {
  createMap(
    (map) => {
      map.addLayer(new WebGLVectorLayer({source, style}));
    },
    (map) => {
      map.addLayer(new VectorLayer({source, style}));
    }
  );
  initializeGui();
  registerGuiParameter(
    'count',
    'Feature count',
    [100000, 500000],
    200000,
    (value, initial) => {
      if (initial) {
        return;
      }
      resetData(
        /** @type {number} */ (value),
        /** @type {number} */ (getGuiParameterValue('radius'))
      );
    }
  );
  registerGuiParameter('radius', 'Radius', [4, 40, 1], 4, (value, initial) => {
    if (initial) {
      return;
    }
    resetData(
      /** @type {number} */ (getGuiParameterValue('count')),
      /** @type {number} */ (value)
    );
  });

  resetData(
    /** @type {number} */ (getGuiParameterValue('count')),
    /** @type {number} */ (getGuiParameterValue('radius'))
  );
}
main();
