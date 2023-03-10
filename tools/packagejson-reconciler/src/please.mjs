export class Please {
  // Sanitises values to be used as Please labels.
  static label(value) {
    return value.replace(/\//g, '_').replace(/ /g, '_');
  }
}
