# JavaScript/TypeScript rules for the Please build system

This repo is a plugin that provides JavaScript/TypeScript rules for the [Please](https://please.build) build system.

## Requirements

- Please v16.20.0+
- NPM v7+

## Set up

- Register the plugin in `BUILD` (or other location):

  ```python
  plugin_repo(
    name = "js",
    plugin = "please-js",
    owner = "tiagovtristao",
    revision = "v0.0.1",
  )
  ```

- Add the following to `.plzconfig`:

  ```ini
  [Parse]
  PreloadSubincludes = ///js//build_defs:javascript

  [Plugin "js"]
  TSConfig = //:tsconfig          ; Target that includes the TypeScript config file. 
  Tsc = //third_party/js:tsc_tool ; Use this target which will be generated later on. 
  ```

- Configure `package.json`:

  - Go to `third_party/js` (create directories if they don't exist).
  - Run `npm init` to create both `package.json` and `package-lock.json` files.
  - Run `npm install typescript` to install TypeScript.
  - Add the following key to `package.json`:
    ```json
    "please": {
      "tools": {
        "tsc": {
          "library": "typescript"
        }
      }
    }
    ```
  - Run `plz run ///js//tools:parse_package_json`.
    - This will create/update the `package_json.build_defs` file with generated targets related to the dependencies and other information found in both `package.json` and `package-lock.json`.
  - Add the following to `third_party/js/BUILD`:
    ```python
    filegroup(
        name = "package_json_build_def",
        srcs = ["package_json.build_defs"],
    )

    subinclude(":package_json_build_def")

    load_package_json(name = "package_json")
    ```

> This set up step could be automated in the future.

## Basic usage

Compiling a TypeScript file:
```python
ts_module(name:str, src:str, out:str=None, deps:list=[], tsconfig:str=CONFIG.JS.TSCONFIG, visibility:list=[])
```

## Structure of `package.json`

Example showcasing how it looks like with additional Please-related configuration:

```json
{
  "name": "js",
  "private": true,
  "description": "Management location for JS libraries",
  "dependencies": {
    "@types/jest": "^27.4.1",
    "@types/react": "^18.0.5",
    "esbuild": "^0.14.53",
    "jest": "^27.5.1",
    "jest-junit": "^13.2.0",
    "react": "^18.0.0",
    "typescript": "^4.6.3"
  },
  "please": {
    "patches": {
      "react": "my-react-patch.patch"
    },
    "libraryDependencies": {
      "react": [
        "@types/react"
      ]
    },
    "tools": {
      "jest": {
        "library": "jest",
        "dependencies": [
          "jest-junit"
        ]
      },
      "tsc": {
        "library": "typescript"
      }
    },
    "paths": {
      "@core3/copperkey": "copperkey"
    }
}
```

### `dependencies` field

Dependencies are installed by running `npm install react` and then `plz run ///js//tools:parse_package_json` to generate the build target (i.e. `//third_party/js:react`).

> A different library version can be installed using an alias. For instance, `npm install my-react@npm:react@16` will install React v16 as `my-react` (i.e. `//third_party/js:my-react`).

> Libaries with `/` characters, such as `@types/react`, have those characters converted to `_` (i.e. `//third_party/js:@types_react`).

### `please` field

This is a custom object that allows us to integrate things better with Please by automatically creating/modifying different build targets.

Supported fields:
- `patches`: Applies patch to installed library.
- `libraryDependencies`: Allows for other dependencies to be included when a library is required. For instance, requiring `//third_party/js:react` will bring in `//third_party/js:@types_react` as well.
- `tools`: Generates a binary target (i.e. `//third_party/js:tsc_tool`) for a library's available binary (i.e. `tsc`). Library binaries are usually found in their `package.json`'s `bin` field.
- `paths`: The source of truth between internal library names and their location. Build rules MUST read and apply these values where path resolving is concerned. This enforcement will prevent unwanted duplication of data that could lead to different places diverging in their values. 

### `overrides` field

An [overrides](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#overrides) field exists that allows to easily change the transitive dependency of a dependency that has a known security issue, for instance.

## JS/TS libraries

Internal libraries can be created and are comprised of `ts_module` rules and a key-value pair entry to the `please.paths` path in `package.json`. The key is the library name (i.e. `@core3/copperkey`) and the value is the directory location.

> Internal libraries are an alternative to [workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces) and don't require their own `package.json` file. NPM workspaces aren't supported by this plugin, since they don't play well with Please.

## Bundling

Bundling is supported using [esbuild](https://esbuild.github.io/).

### Set up

- Go to `third_party/js` and run `npm install esbuild`.
- Update automatic build target generation via `plz run ///js//tools:parse_package_json`. 
- Add the following to `.plzconfig`:
    ```ini
    [Plugin "js"]
    ESBuildLibrary = //third_party/js:esbuild
    ```

### Usage

Bundle an application:
```python
esbuild_bundle(name:str, entry:str, out_dir:str="dist", plugins:list=[], deps:list=[], visibility:list=[])
```

User-defined esbuild [plugins](https://esbuild.github.io/plugins/) are supported:
```python
esbuild_plugin(name:str, plugin:str, deps:list=[], visibility=[])
```

The plugin MUST export a default function that will be called with an object argument containing the following keys:
- `paths`: Internal library mapping information.
- `root`: Repo path.

Example:
```javascript
module.exports = function({paths, root}) {
    return YOUR_ESBUILD_PLUGIN_LOGIC()
}
```

## Testing

Testing is supported using [jest](https://jestjs.io/).

### Set up

- Go to `third_party/js` and run `npm install jest @types/jest`.
- Add the following to `package.json`:
    ```json
    "please": {
      "tools": {
        "jest": {
          "library": "jest"
        }
      }
    }
    ```
- Update automatic build target generation via `plz run ///js//tools:parse_package_json`. 
- Add the following to `.plzconfig`:
    ```ini
    [Plugin "js"]
    Jest = //third_party/js:jest_tool
    JestTypes = //third_party/js:@types_jest
    JestConfig = //:jest_config              ; Target containing Jest configuration.
    ```

### Usage

```python
jest(name:str, src:str, deps:list=[], config:str=CONFIG.JS.JEST_CONFIG, visibility:list=[])
```

## Available rules

```python
# JS/TS compile rule.
ts_module(name:str, src:str, out:str=None, deps:list=[], tsconfig:str=CONFIG.JS.TSCONFIG, visibility:list=[])

# Sass rule.
sass_file(name:str, src:str, deps:list=[], visibility:list=[])

# esbuild bundle rule.
esbuild_bundle(name:str, entry:str, out_dir:str="dist", plugins:list=[], deps:list=[], visibility:list=[])

# esbuild plugin rule.
esbuild_plugin(name:str, plugin:str, deps:list=[], visibility=[])

# Jest test rule.
jest(name:str, src:str, deps:list=[], config:str=CONFIG.JS.JEST_CONFIG, visibility:list=[])
```

## Available configuration

```ini
[Plugin "js"]
PackageJSON = @//third_party/js:package_json     ; Default `package.json` target.
Tsc =  //third_party/js:tsc_tool                 ; TypeScript compiler binary.
TSConfig = //:tsconfig                           ; TypeScript config.
Jest =  //third_party/js:jest_tool               ; Jest test runner.
JestTypes = //third_party/js:@types_jest         ; Jest types.
JestConfig = //:jest_config                      ; Jest config
JestModuleMappers = //build/js/testing:styleMock ; List of testing mocks.
ESBuildLirary = //third_party/js:esbuild         ; `esbuild` npm library.
ESBuildPlugins = //build/js:esbuild_sass_plugin  ; ESBuild plugins.
```

## Example

[please-js-example](https://github.com/tiagovtristao/please-js-example) contains an example Please repo using this plugin.

