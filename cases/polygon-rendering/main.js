import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import {
  WebGLVectorLayer,
  addGeoJsonToSource,
  createMap,
  generatePolygons,
  getGuiParameterValue,
  initializeGui,
  regenerateLayer,
  registerGuiParameter,
} from '../common.js';

const source = new VectorSource({
  wrapX: false,
});

/**
 * @type {import('ol/style/flat.js').FlatStyle}
 */
const baseStyle = {
  'fill-color': ['get', 'color'],
  'text-value': ['get', 'label'],
  'text-font': 'bold 12px "Open Sans", "Arial Unicode MS", sans-serif',
  'text-fill-color': '#333',
  'text-stroke-color': 'rgba(255,255,255,0.8)',
  'text-stroke-width': 2,
};

/**
 * @type {import('ol/style/flat.js').FlatStyle}
 */
const textStyle = {
  'text-value': ['get', 'label'],
  'text-font': 'bold 12px "Open Sans", "Arial Unicode MS", sans-serif',
  'text-fill-color': '#333',
  'text-stroke-color': 'rgba(255,255,255,0.8)',
  'text-stroke-width': 2,
  'text-offset-y': -12,
};

/**
 * @param {number} count The number of features to create.
 * @param {number} numVertices Number of vertices for polygons
 */
function resetData(count, numVertices) {
  addGeoJsonToSource(generatePolygons(count, numVertices), source);
}

function main() {
  createMap(
    (map) => {
      const style = getGuiParameterValue('text')
        ? {...baseStyle, ...textStyle}
        : baseStyle;
      map.addLayer(new WebGLVectorLayer({source, properties: {style}}));
    },
    (map) => {
      const style = getGuiParameterValue('text')
        ? {...baseStyle, ...textStyle}
        : baseStyle;
      map.addLayer(new VectorLayer({source, style}));
    },
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
        /** @type {number} */ (getGuiParameterValue('vertices')),
      );
    },
  );
  registerGuiParameter(
    'vertices',
    'Vertices per polygon',
    [3, 20],
    5,
    (value, initial) => {
      if (initial) {
        return;
      }
      resetData(
        /** @type {number} */ (getGuiParameterValue('count')),
        /** @type {number} */ (value),
      );
    },
  );
  registerGuiParameter(
    'outline',
    'Show outline',
    ['yes', 'no'],
    true,
    (value, initial) => {
      if (value) {
        baseStyle['stroke-width'] = 2;
        baseStyle['stroke-color'] = 'gray';
      } else {
        delete baseStyle['stroke-width'];
        delete baseStyle['stroke-color'];
      }
      regenerateLayer();
    },
  );
  registerGuiParameter(
    'text',
    'Show labels',
    ['yes', 'no'],
    false,
    (value, initial) => {
      if (initial) {
        return;
      }
      regenerateLayer();
    },
  );

  resetData(
    /** @type {number} */ (getGuiParameterValue('count')),
    /** @type {number} */ (getGuiParameterValue('vertices')),
  );
}

main();
