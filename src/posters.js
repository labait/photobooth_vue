/** Cartella posters sotto public/posters/, da VITE_EDITION */
export const postersFolder = import.meta.env.VITE_EDITION || 'cronache_disorganiche';

/**
 * Path pubblico per il browser: /posters/{folder}/{file}
 */
export function posterPublicUrl(filePath) {
  const file = filePath.replace(/^\.\//, '').replace(/^\/+/, '');
  if (file.includes('/')) {
    return `/posters/${file}`;
  }
  return `/posters/${postersFolder}/${file}`;
}

/**
 * Path relativo a public/posters/ per la server function
 */
export function posterServerPath(filePath) {
  const file = filePath.replace(/^\.\//, '').replace(/^\/+/, '');
  if (file.includes('/')) {
    return file;
  }
  return `${postersFolder}/${file}`;
}
