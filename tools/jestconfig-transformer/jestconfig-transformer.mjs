#!/usr/bin/env node

import fs from 'fs';

import { parse, stringify } from 'comment-json';

const {
  PATHS_FILE,
  CONFIG_FILE,
  NODE_PATH,
  REPORTER_OUT_DIR,
  REPORTER_OUT_FILE,
  COVERAGE,
  COVERAGE_FROM,
} = process.env;

function main() {
  const paths = parse(fs.readFileSync(PATHS_FILE, { encoding: 'utf-8' }));
  const jestConfig = require(CONFIG_FILE);

  jestConfig.rootDir = '.';

  jestConfig.modulePaths = jestConfig.modulePaths ?? [];
  jestConfig.modulePaths.push(NODE_PATH);

  jestConfig.moduleNameMapper = jestConfig.moduleNameMapper ?? {};

  // Handle internal library mapping.
  // Input:
  // {
  //   "@core3/copperkey": "copperkey"
  // }
  // Output:
  // {
  //   "^@core3/copperkey$": "<rootDir>/copperkey",
  //   "^@core3/copperkey/(.*)$": "<rootDir>/copperkey/$1",
  // }
  for (const [name, location] of Object.entries(paths)) {
    jestConfig.moduleNameMapper[`^${name}$`] = `<rootDir>/${location}`;
    jestConfig.moduleNameMapper[`^${name}/(.*)$`] = `<rootDir>/${location}/$1`;
  }

  jestConfig.reporters = jestConfig.reporters ?? [];
  jestConfig.reporters.push([
    'jest-junit',
    {
      outputDirectory: REPORTER_OUT_DIR,
      outputName: REPORTER_OUT_FILE,
    },
  ]);

  jestConfig.testResultsProcessor = 'jest-junit';

  jestConfig.collectCoverage = Boolean(COVERAGE);
  jestConfig.collectCoverageFrom = [`<rootDir>/${COVERAGE_FROM}`];
  jestConfig.coverageDirectory = '<rootDir>';

  console.log(stringify(jestConfig, null, 2));
}

if (require.main === module) {
  main();
}
