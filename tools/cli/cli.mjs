#!/usr/bin/env node

import { execFileSync } from 'child_process';

import { Command } from 'commander';
import semver from 'semver';

import { init } from './src/init.mjs';
import { typescript } from './src/typescript.mjs';
import { jest } from './src/jest.mjs';
import { esbuild } from './src/esbuild.mjs';

const program = new Command();

program
  .command('init')
  .description('initialises JS plugin')
  .action(() => {
    ensurePrerequisites();
    init();
  });

const typescriptCmd = program
  .command('typescript')
  .description('TypeScript support');

typescriptCmd
  .command('init')
  .description('initialises TypeScript support')
  .argument('[version]', 'TypeScript version', 'latest')
  .action((version) => {
    ensurePrerequisites();
    typescript.init(version);
  });

typescriptCmd
  .command('new-project')
  .description('initialises TypeScript project')
  .argument('<directory>', 'path to project directory (ie. packages/core)')
  .argument('<name>', 'name of project package/library (ie. @repo/core)')
  .action((directory, name) => {
    ensurePrerequisites();
    typescript.newProject(name, directory);
  });

const jestCmd = program.command('jest').description('Jest support');

jestCmd
  .command('init')
  .description('initialises Jest support')
  .argument('[version]', 'Jest version', 'latest')
  .action((version) => {
    ensurePrerequisites();
    jest.init(version);
  });

const esbuildCmd = program.command('esbuild').description('esbuild support');

esbuildCmd
  .command('init')
  .description('initialises esbuild support')
  .argument('[version]', 'esbuild version', 'latest')
  .action((version) => {
    ensurePrerequisites();
    esbuild.init(version);
  });

program.parse();

function ensurePrerequisites() {
  const npmVersionOutput = execFileSync('npm', ['--version'], {
    encoding: 'utf-8',
    env: process.env,
  });
  const npmVersion = npmVersionOutput.trim();

  if (semver.lt(npmVersion, '7.0.0')) {
    throw Error('A minimum npm v7 is required');
  }

  const plzVersionOutput = execFileSync('plz', ['--version'], {
    encoding: 'utf-8',
    env: process.env,
  });
  const plzVersion = plzVersionOutput
    .trim()
    .substring('Please version '.length);

  if (semver.lt(plzVersion, '16.12.0')) {
    throw Error('A minimum Please v16.12.0 is required');
  }
}
