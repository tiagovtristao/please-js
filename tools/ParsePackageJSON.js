#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const UNREACHABLE_CODE_MESSAGE = `This point is meant to be unreachable and if it happens it means something is likely up with the 'package-lock.json' file provided.`;

class Archives {
  constructor() {
    this._archives = {};
  }

  getAll() {
    return this._archives;
  }

  get(pkg) {
    const {name, version, url} = pkg;

    if (!this._archives.hasOwnProperty(url)) {
      this._archives[url] = {
        url,
        filename: this._generateUniqueFilename(name, version, url),
        label: Please.label(`${name} ${version}`),
      };
    }

    return this._archives[url];
  }

  _generateUniqueFilename(name, version, url) {
      return `${name}-${version}${path.extname(url)}`.replace('@', '').replace('/', '-');
  }
}

class Package {
  static normalise(packageLocation, packages, archives) {
    const packageLocationData = packages[packageLocation];

    const pkg = {
      name: PackageLocation.name(packageLocation),
      version: packageLocationData.version,
      url: packageLocationData.resolved,
    };

    pkg.flattenDependencies = Package.flattenDependencies(packageLocation, packages);

    if (packageLocationData.bin) {
      pkg.binaries = packageLocationData.bin;
    }

    pkg.archive = archives.get(pkg);
    pkg.label = PackageLocation.label(packageLocation);

    return pkg;
  }

  static flattenDependencies(packageLocation, packages) {
    return Array.from(Package.getTransitiveDependencies(packageLocation, packages)).filter((dependency) => dependency !== packageLocation);
  }

  static getTransitiveDependencies(packageLocation, packages, packageDependencyLocations = new Set()) {
    if (packageDependencyLocations.has(packageLocation)) {
      return packageDependencyLocations;
    }

    packageDependencyLocations.add(packageLocation);

    for (const dependencyPackageName in (packages[packageLocation].dependencies || {})) {
      const dependencyPackageLocation = findDependencyLocation(dependencyPackageName, path.join(packageLocation, 'node_modules'))

      Package.getTransitiveDependencies(dependencyPackageLocation, packages, packageDependencyLocations)
    }

    return packageDependencyLocations;

    function findDependencyLocation(dependencyName, currentNodeModulesLocation) {
      while (currentNodeModulesLocation !== '.') {
        const dependencyLocation = path.join(currentNodeModulesLocation, dependencyName);

        if (packages[dependencyLocation]) {
          return dependencyLocation;
        }

        currentNodeModulesLocation = findUpperNodeModulesLocation(currentNodeModulesLocation);
      } 

      throw new Error(UNREACHABLE_CODE_MESSAGE);
    }

    function findUpperNodeModulesLocation(currentNodeModulesLocation) {
      while ((currentNodeModulesLocation = path.dirname(currentNodeModulesLocation)) !== '.') {
        if (path.basename(currentNodeModulesLocation) === 'node_modules') {
          return currentNodeModulesLocation;
        }
      }

      throw new Error(UNREACHABLE_CODE_MESSAGE);
    }
  }
}

class PackageLocation {
  // Extracts the package name out of the package location:
  // node_modules/react => react
  // node_modules/webpack/node_modules/@types/webpack => @types/webpack
  static name(location) {
    let name = path.basename(location)
    let maybeScope = path.basename(path.dirname(location))

    if (maybeScope !== 'node_modules') {
      name = path.join(maybeScope, name)
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
      location = location.substring('node_modules/'.length) 
    }

    return Please.label(location.replace('node_modules', ''))
  }
}

class Please {
  // Sanitises values to be used as Please labels.
  static label(value) {
    return value.replace(/\//g, '_').replace(/ /g, '_');
  }
}

function parsePackages(packageJSON, packages) {
  const pkgs = {};
  const archives = new Archives();

  for (const packageLocation in packages) {
    if (!packageLocation) continue;

    pkgs[packageLocation] = Package.normalise(packageLocation, packages, archives);
  }

  // Augment packages based on extra configuration on the `package.json` file.
  const {
    dependencies = {},
    please: {
      patches: libraryPatches = {},
      libraryDependencies = {},
      tools: libraryTools = {}
    } = {}
  } = packageJSON;

  // Mark only directly installed dependencies as visible.
  for (const dependency in dependencies) {
    pkgs[path.join('node_modules', dependency)].visible = true;
  }

  // Patches.
  for (const [library, patchFile] of Object.entries(libraryPatches)) {
    pkgs[path.join('node_modules', library)].patch = patchFile;
  }

  // Tools.
  const tools = {};
  for (const [binary, data] of Object.entries(libraryTools)) {
    const pkg = pkgs[path.join('node_modules', data.library)];

    const tool = {
      name: binary,
      label: pkg.label,
      binary: pkg.binaries[binary],
      flattenDependencies: pkg.flattenDependencies, 
    };

    for (const dependency of (data.dependencies ?? [])) {
      tool.flattenDependencies = Array.from(
        new Set([
          ...tool.flattenDependencies,
          path.join('node_modules', dependency),
          ...pkgs[path.join('node_modules', dependency)].flattenDependencies,
        ])
      );
    }

    tools[tool.name] = tool;
  }

  // Extra library dependencies. This allows importing 2 or more packages
  // just by referencing one.
  for (const [library, dependencies] of Object.entries(libraryDependencies)) {
    for (const dependency of dependencies) {
      pkgs[path.join('node_modules', library)].flattenDependencies = Array.from(
        new Set([
          ...pkgs[path.join('node_modules', library)].flattenDependencies,
          path.join('node_modules', dependency),
          ...pkgs[path.join('node_modules', dependency)].flattenDependencies,
        ])
      );
    }
  }

  return {packages: pkgs, tools, archives: archives.getAll()};
}


function main() {
  const libraryLocation = path.join(process.cwd(), __LIBRARY_LOCATION__);
  const packageJSONPath = path.join(libraryLocation, 'package.json');
  const packageLockPath = path.join(libraryLocation, 'package-lock.json');

  if (!fs.existsSync(packageJSONPath)) {
    throw new Error(`Required 'package.json' file not found in ${path.dirname(packageJSONPath)}`);
  } else if (!fs.existsSync(packageLockPath)) {
    throw new Error(`Required 'package-lock.json' file not found in ${path.dirname(packageLockPath)}`);
  }

  const packageJSON = require(packageJSONPath);
  const packageLock = require(packageLockPath);
  const {packages, tools, archives} = parsePackages(packageJSON, packageLock.packages);

  const contents = [];

  contents.push(`def load_package_json(name:str):`);
  contents.push(`    package_json(name = name)`);
  contents.push(``)

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
        contents.push(`            ":_${packages[packageLocation].label}#lib",`);
      }
      contents.push(`        ],`);
    }
    if (pkg.patch) {
      contents.push(`        patch = "${pkg.patch}",`);
    }
    if (pkg.visible) {
      contents.push(`        visibility = ["PUBLIC"],`);
    }
    contents.push(`    )`)
    contents.push(``)
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
        contents.push(`            ":_${packages[packageLocation].label}#lib",`);
      }
      contents.push(`        ],`);
    }
    contents.push(`        visibility = ["PUBLIC"],`);
    contents.push(`    )`)
    contents.push(``)
  }

  // remote_file rules
  for (const url in archives) {
    const archive = archives[url];

    contents.push(`    remote_file(`);
    contents.push(`        name = "${archive.label}",`);
    contents.push(`        url = "${url}",`);
    contents.push(`        out = "${archive.filename}",`);
    contents.push(`    )`)
    contents.push(``)
  }

  fs.writeFileSync(path.join(libraryLocation, 'package_json.build_defs'), contents.join('\n'));
}

if (require.main === module) {
  main();
}

