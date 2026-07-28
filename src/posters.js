export const edition = import.meta.env.VITE_EDITION || 'cronache_disorganiche';

let postersCache = null;

/**
 * Carica posters.json dell'edizione corrente da public/editions/{VITE_EDITION}/
 */
export async function loadPosters() {
  if (postersCache) return postersCache;

  const response = await fetch(`/editions/${edition}/posters.json`);
  if (!response.ok) {
    throw new Error(`Impossibile caricare posters per l'edizione "${edition}"`);
  }

  postersCache = await response.json();
  return postersCache;
}

/**
 * Path pubblico per il browser: /editions/{edition}/{file}
 */
export function posterPublicUrl(filePath) {
  const file = filePath.replace(/^\.\//, '').replace(/^\/+/, '');
  if (file.includes('/')) {
    return `/editions/${file.split('/').map(encodeURIComponent).join('/')}`;
  }
  return `/editions/${edition}/${encodeURIComponent(file)}`;
}

/**
 * Path relativo a public/editions/ per la server function
 */
export function posterServerPath(filePath) {
  const file = filePath.replace(/^\.\//, '').replace(/^\/+/, '');
  if (file.includes('/')) {
    return file;
  }
  return `${edition}/${file}`;
}

export function postersJsonUrl() {
  return `/editions/${edition}/posters.json`;
}
