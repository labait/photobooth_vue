export const edition = import.meta.env.VITE_EDITION || 'cronache_disorganiche';

let imagesCache = null;

/**
 * Carica images.json dell'edizione corrente da public/editions/{VITE_EDITION}/
 */
export async function loadPosters() {
  if (imagesCache) return imagesCache;

  const response = await fetch(`/editions/${edition}/images.json`);
  if (!response.ok) {
    throw new Error(`Impossibile caricare le immagini per l'edizione "${edition}"`);
  }

  imagesCache = await response.json();
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
  if (file.startsWith(`${edition}/`)) {
    return `/editions/${file.split('/').map(encodeURIComponent).join('/')}`;
  }
  if (file.startsWith('images/')) {
    return `/editions/${edition}/${file.split('/').map(encodeURIComponent).join('/')}`;
  }
  return `/editions/${edition}/images/${encodeURIComponent(file)}`;
}

/**
 * Path relativo a public/editions/ per la server function
 */
export function posterServerPath(filePath) {
  const file = normalizeFilePath(filePath);
  if (file.startsWith(`${edition}/`)) {
    return file;
  }
  if (file.startsWith('images/')) {
    return `${edition}/${file}`;
  }
  return `${edition}/images/${file}`;
}

export function imagesJsonUrl() {
  return `/editions/${edition}/images.json`;
}
