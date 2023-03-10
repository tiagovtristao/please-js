import path from 'path';

import { Please } from './please.mjs';

export class PackageLocation {
  // Extracts the package name out of the package location:
  // node_modules/react => react
  // node_modules/webpack/node_modules/@types/webpack => @types/webpack
  static name(location) {
    let name = path.basename(location);
    let maybeScope = path.basename(path.dirname(location));

    if (maybeScope !== 'node_modules') {
      name = path.join(maybeScope, name);
    }

    return name;
  }

  // Package locations have the format:
  // 1. node_modules/react
  // 2. node_modules/webpack/node_modules/@types/webpack
  //
  // And this utility transforms them into valid labels:
  // 1. react
  // 2. webpack__@types_webpack
  static label(location) {
    if (location.startsWith('node_modules/')) {
      location = location.substring('node_modules/'.length);
    }

    return Please.label(location.replace('node_modules', ''));
  }
}
