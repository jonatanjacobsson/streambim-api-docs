// Discovers StreamBIM webapp flavours (/webapp/<flavour>/) and compares their widget API.
// A flavour exists if /webapp/<name>/ answers 200 (unknown names give 404). There is no
// listing endpoint, so names come from a wordlist plus any you pass in.
//
// Usage: node tools/discover-flavours.mjs [--origin https://app.streambim.com] [extra names...]
import { writeFileSync, mkdirSync } from 'node:fs';
import { VERIFICATION } from './paths.mjs';

const args = process.argv.slice(2);
const oi = args.indexOf('--origin');
const origin = oi >= 0 ? args.splice(oi, 2)[1] : 'https://app.streambim.com';
const WORDLIST = [
  'default', 'taskctrl', 'infra', 'develop', 'staging', 'test', 'legacy', 'takt', 'hotfix',
  'beta', 'next', 'dev', 'testing', 'preview', 'canary', 'stable', 'old', 'new', 'master', 'main',
  'release', 'rc', 'alpha', 'demo', 'lean', 'embedded', 'mobile', 'v2', 'v3', 'nightly',
  'experimental', 'edge', 'latest', 'prod', 'production', 'qa', 'sandbox', 'kiosk', 'field',
  'viewer', 'classic', 'lite', 'internal', 'rendra', 'infrastructure', 'road', 'rail', 'bridge',
];
const names = [...new Set([...WORDLIST, ...args])];

// Widget-exposed methods are registered as `name:` / `"name",` in rendrao/components/widget-component.
const KNOWN_METHODS = ['getProjectId', 'getBuildingId', 'getUserEmail', 'getCameraState', 'setCameraState', 'setCameraPosition', 'getFloors', 'getSpaces', 'getObjectInfo', 'gotoSpace', 'gotoFloor', 'gotoObject', 'highlightObject', 'deHighlightObject', 'deHighlightAllObjects', 'hideObject', 'showObject', 'showAllObjects', 'getViewportState', 'setViewportState', 'goHome', 'getLayers', 'setLayers', 'showGrids', 'hideGrids', 'takeScreenshot', 'getMapImage', 'getAnnotatedFloorplan', 'setShowExpandButton', 'setExpanded', 'findObjects', 'applyObjectSearch', 'zoomToSearchResult', 'getObjectInfoForSearch', 'resetObjectSearch', 'applyStyles', 'quickSearch', 'setStyles', 'setSkyColor', 'valuesForObjectProperty', 'setNavigationMode', 'setSearchVisualizationMode', 'colorCodeByProperty', 'colorCodeObjects', 'colorCodeSpaces', 'createObject', 'setAuthToken', 'makeApiRequest', 'highlightSystem', 'applyViewpoint', 'colorCodeObjectsWithLegends', 'colorCodeSpacesWithLegends', 'toggleHideNoResultsFloors', 'toggleShowSpaceFootprints', 'toggleShowAllFloors', 'setViewLayout', 'clipToFloor'];

const flavours = [];
for (const name of names) {
  const res = await fetch(`${origin}/webapp/${name}/`);
  if (res.status === 404) continue;
  const html = await res.text();
  const bundle = (html.match(/assets\/rendrao-[a-f0-9]+\.js/) || [])[0];
  const entry = { name, status: res.status, bundle: bundle || null };
  if (bundle) {
    const js = await (await fetch(`${origin}/webapp/${name}/${bundle}`)).text();
    const i = js.indexOf('define("rendrao/components/widget-component"');
    const mod = i < 0 ? '' : js.slice(i, js.indexOf('define("rendrao/', i + 10));
    entry.widgetModuleChars = mod.length;
    entry.methods = KNOWN_METHODS.filter((m) => new RegExp(`[{,(]\\s*"?${m}"?\\s*[:,]`).test(mod));
    // Object colouring with custom colours needs the scene filter to pass the legends table.
    entry.objectCustomColours = js.includes('colorCodeByGuid.colorCoding")');
  }
  flavours.push(entry);
  console.log(name.padEnd(12), res.status, entry.methods ? `${entry.methods.length} methods` : '', entry.objectCustomColours ? 'object colours' : '');
}

const date = new Date().toISOString().slice(0, 10);
mkdirSync(VERIFICATION, { recursive: true });
const file = `${VERIFICATION}/flavours-${date}.json`;
writeFileSync(file, JSON.stringify({ discoveredAt: new Date().toISOString(), origin, probed: names.length, flavours }, null, 2) + '\n');
console.log('wrote', file);
