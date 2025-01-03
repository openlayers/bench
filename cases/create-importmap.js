const currentUrl = new URL(window.location.href);
const olVersion = currentUrl.searchParams.get('olVersion');

if (document.currentScript) {
  const importMap = document.createElement('script');
  importMap.type = 'importmap';

  const commonImports = `
    "color-rgba": "/node_modules/color-rgba/index.js",
    "color-parse": "/node_modules/color-parse/index.js",
    "color-name": "/node_modules/color-name/index.js",
    "color-name/": "/node_modules/color-name/",
    "color-space/": "/node_modules/color-space/",
    "rbush": "/node_modules/rbush/index.js",
    "quickselect": "/node_modules/quickselect/index.js",
    "earcut": "/node_modules/earcut/src/earcut.js"`;

  // this import map is used if we're asking for a specific version
  if (olVersion) {
    importMap.textContent = `
{
  "imports": {
    "ol/": "https://unpkg.com/ol@${olVersion}/",
    "/node_modules/ol/": "https://unpkg.com/ol@${olVersion}/",
    ${commonImports}
  }
}
`;
  } else {
    importMap.textContent = `
{
  "imports": {
    "ol/": "/node_modules/ol/",
    ${commonImports}
  }
}
`;
  }
  document.currentScript.insertAdjacentElement('beforebegin', importMap);

  // trying to import this module to make sure we have a chance of the Webgl renderer to work
  import('ol/render/webgl/VectorStyleRenderer.js')
    .then(() => {
      // do nothing: it worked
    })
    .catch((error) => {
      const withoutOlVersion = new URL(window.location.href);
      withoutOlVersion.searchParams.delete('olVersion');

      // show error in page
      const errorBlock = document.createElement('div');
      errorBlock.innerHTML = `
<p><strong>OpenLayers version "${
        olVersion ?? 'unknown'
      }" failed to load properly</strong></p>
<p>First make sure that the version specified is valid. If it is, try reloading the page a few times (the CDN might have timed out when fetching the library).</p>
<p><a href="${withoutOlVersion}">Click here to reload the page with the latest OpenLayers version (this should work!)</a></p>
<p><small>Error was: ${error.message}</small></p>
      `;
      errorBlock.style.cssText = `
background-color: rgb(255, 243, 205);
border: 1px solid rgb(255 235 175);
border-radius: 6px;
color: rgb(133, 100, 4);
font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
font-size: 16px;
padding: 12px 20px;
box-sizing: border-box;
width: 800px;
max-width: calc(100vw - 20px);`;
      const container = document.createElement('div');
      container.style.cssText = `
position: relative;
height: 100%;
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;
`;
      container.append(errorBlock);
      document.body.append(container);
    });
}
