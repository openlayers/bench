/* eslint-disable no-console */
import GUI from 'lil-gui';
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
    multiWorld: true,
  }),
});

const source = new VectorSource({
  wrapX: false,
});

const colors = ['#6ff05b', '#00AAFF', '#faa91e'];

const gui = new GUI();

const link = new Link();

/**
 *
 * @type {import('ol/style/flat.js').FlatStyle & import('ol/style/literal.js').LiteralStyle}
 */
const style = {
  'stroke-width': ['get', 'width'],
  'stroke-color': ['get', 'color'],
  'stroke-line-dash': [15, 15],
};

const gui_obj = {
  'Line count': 2,
  'Use WebGL': false,
  'Width': 2,
  'Curve Complexity': 2,
  'Dashes': false,
};

const useWebGLCheckbox = gui.add(gui_obj, 'Use WebGL');
const dashCheckbox = gui.add(gui_obj, 'Dashes');
const lineCountSlider = gui.add(gui_obj, 'Line count', 2, 100, 1);
const widthSlider = gui.add(gui_obj, 'Width', 1, 20, 1);
const curveComplexitySlider = gui.add(gui_obj, 'Curve Complexity', 2, 1000, 1);

useWebGLCheckbox.onChange((/** @type {boolean} */ value) => {
  if (value) {
    link.update('renderer', 'webgl');
    useWebGL();
  } else {
    link.update('renderer', 'canvas');
    useCanvas();
  }
});

lineCountSlider.onFinishChange(() => {
  link.update('count', lineCountSlider.getValue());
  resetData(
    parseInt(lineCountSlider.getValue()),
    gui_obj['Curve Complexity'],
    gui_obj.Width
  );
});

curveComplexitySlider.onFinishChange(() => {
  link.update('curveComplexity', curveComplexitySlider.getValue());
  resetData(
    gui_obj['Line count'],
    parseInt(curveComplexitySlider.getValue()),
    gui_obj.Width
  );
});

widthSlider.onFinishChange(() => {
  link.update('width', widthSlider.getValue());
  resetData(
    gui_obj['Line count'],
    gui_obj['Curve Complexity'],
    parseInt(widthSlider.getValue())
  );
});

dashCheckbox.onChange((/** @type {boolean} */ value) => {
  link.update('dash', value ? 'yes' : 'no');
  if (value) {
    style['stroke-line-dash'] = [15, 15];
  } else {
    delete style['stroke-line-dash'];
  }

  resetData(
    lineCountSlider.getValue(),
    curveComplexitySlider.getValue(),
    widthSlider.getValue()
  );

  if (gui_obj['Use WebGL']) {
    useWebGL();
  } else {
    useCanvas();
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
  resetData(
    parseInt(newCount),
    parseInt(curveComplexitySlider.getValue()),
    parseInt(widthSlider.getValue())
  );
});

const initialCurveComplexity = link.track(
  'curveComplexity',
  (newCurveComplexity) => {
    resetData(
      parseInt(lineCountSlider.getValue()),
      parseInt(newCurveComplexity),
      parseInt(widthSlider.getValue())
    );
  }
);

const initialWidth = link.track('width', (newWidth) => {
  resetData(
    parseInt(lineCountSlider.getValue()),
    parseInt(curveComplexitySlider.getValue()),
    parseInt(newWidth)
  );
});

const initialDash = link.track('dash', (newDash) => {
  if (newDash === 'yes') {
    style['stroke-line-dash'] = [15, 15];
  } else {
    delete style['stroke-line-dash'];
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
 * @param {number} lineCount From 1 to 100
 * @param {number} curveComplexity From 2 to 1000
 * @param {number} width line width
 */

function makeData(lineCount, curveComplexity, width) {
  /**
   * @type {Array<import('geojson').Feature>}
   */
  const features = [];
  const periodCount = 10;
  const periodWidth = 360 / periodCount;
  const periodHeight = 20;
  const latitudeSpacing = 180 / (lineCount + 1);
  let colorIndex = 0; // Initialize color index

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
        color: colors[colorIndex], // Use deterministic color selection
        width,
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
    colorIndex = (colorIndex + 1) % colors.length; // Update color index
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
 * @param {number} lineCount
 * @param {number} curveComplexity
 * @param {number} width
 */

function resetData(lineCount, curveComplexity, width) {
  source.clear();
  const data = makeData(lineCount, curveComplexity, width);
  const features = parseFeatures(data);
  addFeatures(features);
  console.time('first render');
}

function main() {
  const count = initialCount
    ? parseInt(initialCount)
    : parseInt(lineCountSlider.getValue());
  const curveComplexity = initialCurveComplexity
    ? parseInt(initialCurveComplexity)
    : parseInt(curveComplexitySlider.getValue());
  const width = initialWidth
    ? parseInt(initialWidth)
    : parseInt(widthSlider.getValue());

  gui_obj.Dashes = initialDash === 'yes';
  dashCheckbox.listen();

  if (gui_obj.Dashes) {
    style['stroke-line-dash'] = [15, 15];
  } else {
    delete style['stroke-line-dash'];
  }

  resetData(count, curveComplexity, width);

  gui_obj['Line count'] = count;
  gui_obj['Curve Complexity'] = curveComplexity;
  lineCountSlider.listen();
  curveComplexitySlider.listen();

  gui_obj['Use WebGL'] = initialRenderer === 'webgl';
  useWebGLCheckbox.listen();

  if (gui_obj['Use WebGL']) {
    useWebGL();
  } else {
    useCanvas();
  }
}

main();
