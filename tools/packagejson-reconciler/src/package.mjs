import path from 'path';

import { Archives } from './archives.mjs';
import { PackageLocation } from './package-location.mjs';

const UNREACHABLE_CODE_MESSAGE = `This point is meant to be unreachable and if it happens it means something is likely up with the 'package-lock.json' file provided.`;

class Package {
  static normalise(packageLocation, packages, archives) {
    const packageLocationData = packages[packageLocation];

    const pkg = {
      name: PackageLocation.name(packageLocation),
      version: packageLocationData.version,
      url: packageLocationData.resolved,
    };

    pkg.flattenDependencies = Package.flattenDependencies(
      packageLocation,
      packages
    );

    if (packageLocationData.bin) {
      pkg.binaries = packageLocationData.bin;
    }

    pkg.archive = archives.get(pkg);
    pkg.label = PackageLocation.label(packageLocation);

    return pkg;
  }

  static flattenDependencies(packageLocation, packages) {
    return Array.from(
      Package.getTransitiveDependencies(packageLocation, packages)
    ).filter((dependency) => dependency !== packageLocation);
  }

  static getTransitiveDependencies(
    packageLocation,
    packages,
    packageDependencyLocations = new Set()
  ) {
    if (packageDependencyLocations.has(packageLocation)) {
      return packageDependencyLocations;
    }

    packageDependencyLocations.add(packageLocation);

    for (const dependencyPackageName in packages[packageLocation]
      .dependencies || {}) {
      const dependencyPackageLocation = findDependencyLocation(
        dependencyPackageName,
        path.join(packageLocation, 'node_modules')
      );

      Package.getTransitiveDependencies(
        dependencyPackageLocation,
        packages,
        packageDependencyLocations
      );
    }

    return packageDependencyLocations;

    function findDependencyLocation(
      dependencyName,
      currentNodeModulesLocation
    ) {
      while (currentNodeModulesLocation !== '.') {
        const dependencyLocation = path.join(
          currentNodeModulesLocation,
          dependencyName
        );

        if (packages[dependencyLocation]) {
          return dependencyLocation;
        }

        currentNodeModulesLocation = findUpperNodeModulesLocation(
          currentNodeModulesLocation
        );
      }

      throw new Error(UNREACHABLE_CODE_MESSAGE);
    }

    function findUpperNodeModulesLocation(currentNodeModulesLocation) {
      while (
        (currentNodeModulesLocation = path.dirname(
          currentNodeModulesLocation
        )) !== '.'
      ) {
        if (path.basename(currentNodeModulesLocation) === 'node_modules') {
          return currentNodeModulesLocation;
        }
      }

      throw new Error(UNREACHABLE_CODE_MESSAGE);
    }
  }
}

export function parser(packageJSON, packages) {
  const pkgs = {};
  const archives = new Archives();

  for (const packageLocation in packages) {
    if (!packageLocation) continue;

    pkgs[packageLocation] = Package.normalise(
      packageLocation,
      packages,
      archives
    );
  }

  // Augment packages based on extra configuration on the `package.json` file.
  const {
    dependencies = {},
    please: {
      patches: libraryPatches = {},
      libraryDependencies = {},
      tools: libraryTools = {},
    } = {},
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

    for (const dependency of data.dependencies ?? []) {
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

  return { packages: pkgs, tools, archives: archives.getAll() };
}
