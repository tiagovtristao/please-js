import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { parse, stringify } from 'comment-json';

const libraryLocation = __LIBRARY_LOCATION__;

export function updatePackageJSON(callback) {
  const packageJSON = parse(
    fs.readFileSync(path.join(libraryLocation, 'package.json'), {
      encoding: 'utf-8',
    })
  );

  callback(packageJSON);

  fs.writeFileSync(
    path.join(libraryLocation, 'package.json'),
    stringify(packageJSON, null, 2),
    { encoding: 'utf-8' }
  );

  console.log('Reconciling package.json changes...');
  reconcilePackageJSON();
}

export function reconcilePackageJSON() {
  execFileSync('plz', ['run', '///js//:packagejson-reconciler'], {
    env: process.env,
  });
}
