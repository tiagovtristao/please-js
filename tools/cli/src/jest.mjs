import { execFileSync } from 'child_process';
import fs from 'fs';

import { updatePackageJSON } from './utils.mjs';

const libraryLocation = __LIBRARY_LOCATION__;
const moduleNameMapperDirectory = 'build/js/testing';

const jestConfig = `
module.exports = {
    moduleNameMapper: {
      "\\.(css|scss)$": "<rootDir>/${moduleNameMapperDirectory}/styleMock.js"
    },
};
`.trimStart();

const styleMock = `
// Used by Jest to mock out CSS/Sass files
module.exports = {};
`.trimStart();

const styleMockRule = `
filegroup(
    name = "style_mock",
    srcs = ["styleMock.js"],
    visibility = ["PUBLIC"],
)
`.trimStart();

const jestPlzconfig = `
[plugin "js"]
jest = //${libraryLocation}:jest_tool ; Jest binary rule
jesttypes = //${libraryLocation}:@types_jest ; Jest types
jestconfig = //:jest_config ; Jest config
jestjunit = //${libraryLocation}:jest-junit ; Jest JUnit
jestmodulemappers = //${moduleNameMapperDirectory}:style_mock ; CSS/SASS module mapper mock
`.trimStart();

export const jest = {
  init: function (version) {
    version = version || 'latest';

    console.log(
      "Installing 'jest', '@types/jest' and 'jest-junit' npm libraries..."
    );
    execFileSync(
      'npm',
      ['install', `jest@${version}`, `@types/jest@${version}`, 'jest-junit'],
      {
        cwd: libraryLocation,
        env: process.env,
      }
    );

    console.log("Setting up 'jest' as a binary rule...");
    updatePackageJSON((packageJSON) => {
      packageJSON.please.tools['jest'] = { library: 'jest' };
    });

    console.log('Setting up Jest configuration...');
    if (!fs.existsSync('jest.config.js')) {
      fs.appendFileSync('jest.config.js', jestConfig);
    }

    console.log('Setting up style testing mocks...');
    if (!fs.existsSync(moduleNameMapperDirectory)) {
      console.log(`Creating ${moduleNameMapperDirectory} directories...`);
      fs.mkdirSync(moduleNameMapperDirectory, {
        recursive: true,
      });
    }

    fs.appendFileSync(
      path.join(moduleNameMapperDirectory, 'styleMock.js'),
      styleMock
    );
    fs.appendFileSync(
      path.join(moduleNameMapperDirectory, 'BUILD'),
      styleMockRule
    );

    fs.appendFileSync('BUILD', jestConfigRule);
    fs.appendFileSync('.plzconfig', jestPlzconfig);
  },
};
