import fs from 'fs';
import path from 'path';

import { reconcilePackageJSON } from './utils.mjs';

const libraryLocation = __LIBRARY_LOCATION__;

const preloadSubincludes = `
[parse]
preloadsubincludes = ///js//build_defs:javascript
`.trimStart();

const packageJSONBuildDefsRule = `
filegroup(
    name = "package_json",
    srcs = ["package_json.build_defs"],
    visibility = [
        "//${libraryLocation}:all",
    ]
)
`.trimStart();

const packageJSON = `
{      
  "name": "js",
  "private": true,
  "description": "Management location for JS libraries",
  "dependencies": {},
  "please": {
    "patches": {},
    "libraryDependencies": {},
    "tools": {},
    "paths": {}
  }
}
`.trimStart();

const packageLockJSON = `
{
  "name": "js",
  "packages": []
}
`.trimStart();

const loadPackageJSON = `
subinclude("//${libraryLocation}/build_defs:package_json")

load_package_json(name = "package_json")
`.trimStart();

export function init() {
  console.log('Configuring .plzconfig...');
  fs.appendFileSync('.plzconfig', preloadSubincludes);

  if (!fs.existsSync(path.join(libraryLocation, 'build_defs'))) {
    console.log(`Creating ${libraryLocation} directories...`);
    fs.mkdirSync(path.join(libraryLocation, 'build_defs'), {
      recursive: true,
    });
  }

  console.log(`Populating ${libraryLocation} build files...`);
  fs.appendFileSync(
    path.join(libraryLocation, 'build_defs', 'BUILD'),
    packageJSONBuildDefsRule
  );
  fs.appendFileSync(path.join(libraryLocation, 'BUILD'), loadPackageJSON);

  console.log(
    'Initialising package.json with barebones Please configuration...'
  );
  fs.appendFileSync(path.join(libraryLocation, 'package.json'), packageJSON);
  fs.appendFileSync(
    path.join(libraryLocation, 'package-lock.json'),
    packageLockJSON
  );

  console.log('Reconciling package.json changes...');
  reconcilePackageJSON();
}
