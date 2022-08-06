#!/usr/bin/env node

const path = require('path');

const { ENTRY_POINT, OUT_DIR, PATHS_FILE, CONFIG_FILE, NODE_PATH } = process.env;

function main() {
  const paths = require(PATHS_FILE);
  const tsConfigContents = require(CONFIG_FILE);

  // Only the given source file is meant to be considered
  delete tsConfigContents.include;
  tsConfigContents.files = [ENTRY_POINT];

  tsConfigContents.compilerOptions = tsConfigContents.compilerOptions ?? {};
  tsConfigContents.compilerOptions.baseUrl = '.';
  tsConfigContents.compilerOptions.declaration = true;
  tsConfigContents.compilerOptions.sourceMap = true;
  tsConfigContents.compilerOptions.skipLibCheck = true;
  tsConfigContents.compilerOptions.allowJs = true;
  tsConfigContents.compilerOptions.noEmit = false;
  tsConfigContents.compilerOptions.outDir = OUT_DIR;

  tsConfigContents.compilerOptions.typeRoots = [path.join(NODE_PATH, '@types')];

  tsConfigContents.compilerOptions.paths = tsConfigContents.compilerOptions.paths ?? {};
  tsConfigContents.compilerOptions.paths['*'] = [
    path.join(NODE_PATH, '*'),
    path.join(NODE_PATH, '@types', '*'),
  ];

  // Handle internal library mapping.
  for (const [importID, importLocation] of Object.entries(paths ?? {})) {
    tsConfigContents.compilerOptions.paths[importID] = [importLocation];
  }

  console.log(JSON.stringify(tsConfigContents, null, ' '));
}

if (require.main === module) {
  main();
}

