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
 * @type {Array<import('ol/style/flat.js').Rule>}
 */
const style = [
  {
    style: {
      'fill-color': ['get', 'color'],
      'stroke-color': 'gray',
      'stroke-width': 2,
    },
    filter: ['>', ['get', 'ratio'], ['var', 'minRatio']],
  },
];

/**
 * @param {number} count The number of features to create.
 */
function resetData(count) {
  addGeoJsonToSource(generatePolygons(count, 4), source);
}

function main() {
  createMap(
    (map) => {
      map.addLayer(new WebGLVectorLayer({source, properties: {style}}));
    },
    (map) => {
      map.addLayer(
        new VectorLayer({
          source,
          style,
        }),
      );
    },
  );
  initializeGui();
  registerGuiParameter(
    'count',
    'Feature count',
    [100000, 500000],
    200000,
    (value, initial) => {
      resetData(/** @type {number} */ (value));
    },
  );
  registerGuiParameter(
    'filterValue',
    '% of shapes filtered out',
    [0, 100],
    0,
    (value, initial) => {
      if (initial) {
        return;
      }
      // TODO: use a style variables here instead
      style[0].filter = ['>', ['get', 'ratio'], value];
      regenerateLayer();
    },
  );
  style[0].filter = [
    '>',
    ['get', 'ratio'],
    getGuiParameterValue('filterValue'),
  ];
}

main();
