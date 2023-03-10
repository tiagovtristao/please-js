#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import { parse, stringify } from 'comment-json';

const { ENTRY_POINTS, OUT_DIR, PATHS_FILE, CONFIG_FILE, NODE_PATH } =
  process.env;

function main() {
  const paths = parse(fs.readFileSync(PATHS_FILE, { encoding: 'utf-8' }));
  const tsConfig = parse(fs.readFileSync(CONFIG_FILE, { encoding: 'utf-8' }));

  // Only the entry point files are meant to be considered
  delete tsConfig.include;
  tsConfig.files = ENTRY_POINTS.split(' ');

  tsConfig.compilerOptions = tsConfig.compilerOptions ?? {};
  tsConfig.compilerOptions.baseUrl = '.';
  tsConfig.compilerOptions.declaration = true;
  tsConfig.compilerOptions.sourceMap = true;
  tsConfig.compilerOptions.skipLibCheck = false; // TODO: Set this to true
  tsConfig.compilerOptions.allowJs = true;
  tsConfig.compilerOptions.noEmit = false;
  tsConfig.compilerOptions.rootDir = '.';
  tsConfig.compilerOptions.outDir = OUT_DIR;

  // Requires TS 4.7
  // TODO: Explain more the need for this
  tsConfig.compilerOptions.moduleSuffixes = [
    '.d',
    ...(tsConfig.compilerOptions.moduleSuffixes || ['']),
  ];

  tsConfig.compilerOptions.typeRoots = [path.join(NODE_PATH, '@types')];

  tsConfig.compilerOptions.paths = tsConfig.compilerOptions.paths ?? {};
  tsConfig.compilerOptions.paths['*'] = [
    path.join(NODE_PATH, '*'),
    path.join(NODE_PATH, '@types', '*'),
  ];

  // Handle internal library mapping.
  for (const [importID, importLocation] of Object.entries(paths ?? {})) {
    tsConfig.compilerOptions.paths[importID] = [importLocation];
    tsConfig.compilerOptions.paths[path.join(importID, '*')] = [
      path.join(importLocation, '*'),
    ];
  }

  console.log(stringify(tsConfig, null, 2));
}

if (require.main === module) {
  main();
}
