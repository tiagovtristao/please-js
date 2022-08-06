#!/usr/bin/env node

const { PATHS_FILE, CONFIG_FILE, NODE_PATH } = process.env;

function main() {
  const paths = require(PATHS_FILE);
  const jestConfigContents = require(CONFIG_FILE);

  jestConfigContents.rootDir = '.';

  jestConfigContents.modulePaths = jestConfigContents.modulePaths ?? [];
  jestConfigContents.modulePaths.push(NODE_PATH);

  jestConfigContents.moduleNameMapper = jestConfigContents.moduleNameMapper ?? {};

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
    jestConfigContents.moduleNameMapper[`^${name}$`] = `<rootDir>/${location}`;
    jestConfigContents.moduleNameMapper[`^${name}/(.*)$`] = `<rootDir>/${location}/$1`;
  }

  console.log(JSON.stringify(jestConfigContents, null, ' '));
}

if (require.main === module) {
  main();
}

