/* eslint-disable no-console */
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import WebGLVectorLayer from 'ol/layer/WebGLVector.js';
import {
  addGeoJsonToSource,
  createMap,
  generateLines,
  getGuiParameterValue,
  initializeGui,
  regenerateLayer,
  registerGuiParameter,
} from '../common.js';

const source = new VectorSource({
  wrapX: false,
});

/**
 *
 * @type {import('ol/style/flat.js').FlatStyle}
 */
const style = {
  'stroke-width': ['get', 'width'],
  'stroke-color': ['get', 'color'],
  'stroke-line-dash': [15, 15],
};

/**
 * @param {number} lineCount From 1 to 100
 * @param {number} curveComplexity From 2 to 1000
 * @param {number} width line width
 */
function resetData(lineCount, curveComplexity, width) {
  addGeoJsonToSource(generateLines(lineCount, curveComplexity, width), source);
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
    'Line count',
    [2, 100, 10],
    2,
    (value, initial) => {
      if (initial) {
        return;
      }
      resetData(
        /** @type {number} */ (value),
        /** @type {number} */ (getGuiParameterValue('curveComplexity')),
        /** @type {number} */ (getGuiParameterValue('width'))
      );
    }
  );
  registerGuiParameter('width', 'Width', [1, 20, 1], 2, (value, initial) => {
    if (initial) {
      return;
    }
    resetData(
      /** @type {number} */ (getGuiParameterValue('count')),
      /** @type {number} */ (getGuiParameterValue('curveComplexity')),
      /** @type {number} */ (value)
    );
  });
  registerGuiParameter(
    'curveComplexity',
    'Curve Complexity',
    [2, 1000, 1],
    2,
    (value, initial) => {
      if (initial) {
        return;
      }
      resetData(
        /** @type {number} */ (getGuiParameterValue('count')),
        /** @type {number} */ (value),
        /** @type {number} */ (getGuiParameterValue('width'))
      );
    }
  );
  registerGuiParameter(
    'dash',
    'Dashes',
    ['yes', 'no'],
    false,
    (value, initial) => {
      if (value) {
        style['stroke-line-dash'] = [15, 15];
      } else {
        delete style['stroke-line-dash'];
      }
      regenerateLayer();
    }
  );

  resetData(
    /** @type {number} */ (getGuiParameterValue('count')),
    /** @type {number} */ (getGuiParameterValue('curveComplexity')),
    /** @type {number} */ (getGuiParameterValue('width'))
  );
}
main();
