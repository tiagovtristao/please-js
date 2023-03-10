import { execFileSync } from 'child_process';
import fs from 'fs';

import { reconcilePackageJSON } from './utils.mjs';

const libraryLocation = __LIBRARY_LOCATION__;

const esbuildPlzconfig = `
[plugin "js"]
esbuildlibrary = //${libraryLocation}:esbuild ; esbuild npm library
`.trimStart();

export const esbuild = {
  init: function (version) {
    version = version || 'latest';

    console.log("Installing 'esbuild' npm library...");
    execFileSync('npm', ['install', `esbuild@${version}`], {
      cwd: libraryLocation,
      env: process.env,
    });

    console.log('Reconciling package.json changes...');
    reconcilePackageJSON();

    fs.appendFileSync('.plzconfig', esbuildPlzconfig);
  },
};
