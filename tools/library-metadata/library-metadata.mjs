#!/usr/bin/env node

import fs from 'fs';

import { parse } from 'comment-json';

function licences(packageJSON) {
  const licencesValue = packageJSON.license || packageJSON.licenses;
  if (!licencesValue) {
    return [];
  }

  return (
    normaliseLicencesArray(licencesValue)
      // Some clean up
      .map((licence) => {
        // `(BSD OR MIT)` => `BSD OR MIT`
        if (licence.startsWith('(') && licence.endsWith(')')) {
          licence = licence.substring(1, licence.length - 1);
        }
        // `BSD-like` => `BSD`
        return licence.replace('-like', '');
      })
      // Attempts to reduce `"BSD OR MIT OR ISC"` to `["BSD", "MIT", "ISC"]`
      .reduce((acc, licence) => {
        const licenceParts = licence.split(' OR ');
        if (licenceParts.every((part) => !part.includes(' '))) {
          return [...acc, ...licenceParts];
        }
        return [...acc, licence];
      }, [])
  );

  function normaliseLicencesArray(value) {
    if (typeof value === 'string') {
      return [value];
    } else if (value.type) {
      return [value.type];
    } else if (Array.isArray(value)) {
      return value.map((licence) => licence.type);
    }

    console.warning(`Unknown licence value structure: ${value}`);
    return [];
  }
}

function main() {
  const packageJSON = parse(
    fs.readFileSync('package.json', {
      encoding: 'utf-8',
    })
  );

  const licencesArr = licences(packageJSON);
  if (licencesArr.length) {
    console.log(`licences:${licencesArr.join(',')}`);
  }

  const { name, version } = packageJSON;
  console.log(`name_version:${name}@${version}`);
}

if (require.main === module) {
  main();
}
