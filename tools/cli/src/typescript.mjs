import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { updatePackageJSON } from './utils.mjs';

const libraryLocation = __LIBRARY_LOCATION__;

const tsconfigRule = `
filegroup(
    name = "tsconfig",
    srcs = ["tsconfig.json"],
    visibility = ["PUBLIC"],
)
`.trimStart();

const tsPlzconfig = `
[plugin "js"]
tsconfig = //:tsconfig ; Target that includes the TypeScript config file
tsc = //${libraryLocation}:tsc_tool ; TypeScript binary rule
`.trimStart();

const tsProjectBuildDefs = (directory) =>
  `
def ts_module(name:str, src:str, deps:list=[], visibility:list=[]):
    return ts_project_module(
        name = name,
        src = src,
        project_target = "//${directory}:_ts_project",
        deps = deps,
        visibility = visibility,
    )
`.trimStart();

const tsProjectBuildDefsRule = (directory) =>
  `
filegroup(
    name = "ts_project",
    srcs = ["ts_project.build_defs"],
    visibility = ["//${directory}/..."],
)
`.trimStart();

const tsProjectRules = (directory) =>
  `
subinclude("//${directory}/build_defs:ts_project")

ts_project(
    entry_points = [":index"],
)

ts_module(
    name = "index",
    src = "index.ts", # Current default entry point
    deps = [
        # Needs to be populated...
    ],
    visibility = ["PUBLIC"]
)
`.trimStart();

export const typescript = {
  init: function (version) {
    version = version || 'latest';

    console.log("Installing 'typescript' npm library...");
    execFileSync('npm', ['install', `typescript@${version}`], {
      cwd: libraryLocation,
      env: process.env,
    });

    console.log("Setting up 'tsc' as a binary rule...");
    updatePackageJSON((packageJSON) => {
      packageJSON.please.tools['tsc'] = { library: 'typescript' };
    });

    console.log('Setting up TypeScript configuration...');
    if (!fs.existsSync('tsconfig.json')) {
      execFileSync(
        path.resolve(path.join(libraryLocation, 'node_modules/.bin/tsc')),
        ['--init']
      );
    }

    fs.appendFileSync('BUILD', tsconfigRule);
    fs.appendFileSync('.plzconfig', tsPlzconfig);
  },
  newProject: function (name, directory) {
    if (!fs.existsSync(path.join(directory, 'build_defs'))) {
      console.log(`Creating ${directory} directories...`);
      fs.mkdirSync(path.join(directory, 'build_defs'), {
        recursive: true,
      });
    }

    console.log(`Populating ${directory} build files...`);
    fs.appendFileSync(
      path.join(directory, 'build_defs', 'ts_project.build_defs'),
      tsProjectBuildDefs(directory)
    );

    fs.appendFileSync(
      path.join(directory, 'build_defs', 'BUILD'),
      tsProjectBuildDefsRule(directory)
    );

    fs.appendFileSync(path.join(directory, 'BUILD'), tsProjectRules(directory));

    console.log(`Updating package.json with new project path...`);
    updatePackageJSON((packageJSON) => {
      packageJSON.please.paths[name] = directory;
    });
  },
};
