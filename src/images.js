import { editionCode, loadEdition } from './editionConfig.js';

export { editionCode, loadEdition, editionAssetStoragePath } from './editionConfig.js';
export { editionJsonPublicPath } from './editionPaths.js';

let imagesCache = null;

/**
 * Carica le immagini poster dall'edition.json corrente.
 */
export async function loadPosters() {
  if (imagesCache) return imagesCache;

  const edition = await loadEdition();
  imagesCache = edition.images ?? [];
  return imagesCache;
}

function normalizeFilePath(filePath) {
  return filePath.replace(/^\.\//, '').replace(/^\/+/, '');
}

/**
 * Path pubblico per il browser: /editions/{edition}/images/{file}
 */
export function posterPublicUrl(filePath) {
  const file = normalizeFilePath(filePath);
  if (file.startsWith(`${editionCode}/`)) {
    return `/editions/${file.split('/').map(encodeURIComponent).join('/')}`;
  }
  if (file.startsWith('images/')) {
    return `/editions/${editionCode}/${file.split('/').map(encodeURIComponent).join('/')}`;
  }
  return `/editions/${editionCode}/images/${encodeURIComponent(file)}`;
}

/**
 * Path relativo a public/editions/ per la server function
 */
export function posterServerPath(filePath) {
  const file = normalizeFilePath(filePath);
  if (file.startsWith(`${editionCode}/`)) {
    return file;
  }
  if (file.startsWith('images/')) {
    return `${editionCode}/${file}`;
  }
  return `${editionCode}/images/${file}`;
}

export function imagesJsonUrl() {
  return `/editions/${editionCode}/edition.json`;
}
