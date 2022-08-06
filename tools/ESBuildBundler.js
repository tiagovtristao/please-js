#!/usr/bin/env node

const path = require('path');
const esbuild = require('esbuild');

const { ENTRY_POINT, OUT, TMP_DIR, PATHS_FILE, NODE_PATH, PLUGINS } = process.env;

function main() {
  const paths = require(PATHS_FILE);

  const pathsPlugin = {
    name: 'paths',
    setup(build) {
      // Handle internal library mapping.
      for (const [name, location] of Object.entries(paths)) {
        build.onResolve({ filter: new RegExp(`^${name}/?`) }, args => ({
          path: require.resolve(path.join(TMP_DIR, location + args.path.substring(name.length))),
        }))
      }
    },
  };

  const plugins = PLUGINS.split(':').filter(Boolean);

  esbuild.build({
    entryPoints: [ENTRY_POINT],
    bundle: true,
    outdir: OUT,
    nodePaths: [NODE_PATH],
    plugins: [
      pathsPlugin,
      ...(plugins.map((plugin) => require(path.join(TMP_DIR, plugin))({paths, root: TMP_DIR})))
    ],
  }).catch((err) => {
    console.error(err);
    process.exit(1)
  });
}

if (require.main === module) {
  main();
}

