import path from 'path';

import { Please } from './please.mjs';

export class Archives {
  #archives = {};

  getAll() {
    return this.#archives;
  }

  get(pkg) {
    const { name, version, url } = pkg;

    if (!this.#archives.hasOwnProperty(url)) {
      this.#archives[url] = {
        url,
        filename: Archives.#generateUniqueFilename(name, version, url),
        label: Please.label(`${name} ${version}`),
      };
    }

    return this.#archives[url];
  }

  static #generateUniqueFilename(name, version, url) {
    return `${name}-${version}${path.extname(url)}`
      .replace('@', '')
      .replace('/', '-');
  }
}
