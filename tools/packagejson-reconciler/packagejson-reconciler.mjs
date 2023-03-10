#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import { parse } from 'comment-json';

import { parser } from './src/package.mjs';

const libraryLocation = __LIBRARY_LOCATION__;

function main() {
  const libraryLocationPath = path.join(process.cwd(), libraryLocation);
  const packageJSONPath = path.join(libraryLocationPath, 'package.json');
  const packageLockPath = path.join(libraryLocationPath, 'package-lock.json');

  if (!fs.existsSync(packageJSONPath)) {
    throw new Error(
      `Required 'package.json' file not found in ${path.dirname(
        packageJSONPath
      )}`
    );
  } else if (!fs.existsSync(packageLockPath)) {
    throw new Error(
      `Required 'package-lock.json' file not found in ${path.dirname(
        packageLockPath
      )}`
    );
  }

  const packageJSON = parse(
    fs.readFileSync(packageJSONPath, { encoding: 'utf-8' })
  );
  const packageLock = parse(
    fs.readFileSync(packageLockPath, { encoding: 'utf-8' })
  );
  const { packages, tools, archives } = parser(
    packageJSON,
    packageLock.packages
  );

  const contents = [];

  contents.push(`def load_package_json(name:str):`);
  contents.push(`    package_json(name = name)`);
  contents.push(``);

  // npm_library rules
  for (const packageLocation in packages) {
    const pkg = packages[packageLocation];

    contents.push(`    npm_library(`);
    contents.push(`        name = "${pkg.label}",`);
    contents.push(`        archive = ":${pkg.archive.label}",`);
    contents.push(`        install_dir = "${packageLocation}",`);
    if (pkg.flattenDependencies.length) {
      contents.push(`        deps = [`);
      for (const packageLocation of pkg.flattenDependencies) {
        contents.push(
          `            ":_${packages[packageLocation].label}#lib",`
        );
      }
      contents.push(`        ],`);
    }
    if (pkg.patch) {
      contents.push(`        patch = "${pkg.patch}",`);
    }
    if (pkg.visible) {
      contents.push(`        visibility = ["PUBLIC"],`);
    }
    contents.push(`    )`);
    contents.push(``);
  }

  // npm_binary rules
  for (const name in tools) {
    const tool = tools[name];

    contents.push(`    npm_binary(`);
    contents.push(`        name = "${tool.name}_tool",`);
    contents.push(`        library = ":_${tool.label}#lib",`);
    contents.push(`        binary = "${tool.binary}",`);
    if (tool.flattenDependencies.length) {
      contents.push(`        library_deps = [`);
      for (const packageLocation of tool.flattenDependencies) {
        contents.push(
          `            ":_${packages[packageLocation].label}#lib",`
        );
      }
      contents.push(`        ],`);
    }
    contents.push(`        visibility = ["PUBLIC"],`);
    contents.push(`    )`);
    contents.push(``);
  }

  // remote_file rules
  for (const url in archives) {
    const archive = archives[url];

    contents.push(`    remote_file(`);
    contents.push(`        name = "${archive.label}",`);
    contents.push(`        url = "${url}",`);
    contents.push(`        out = "${archive.filename}",`);
    contents.push(`    )`);
    contents.push(``);
  }

  fs.writeFileSync(
    path.join(libraryLocationPath, 'build_defs', 'package_json.build_defs'),
    contents.join('\n')
  );
}

if (require.main === module) {
  main();
}
