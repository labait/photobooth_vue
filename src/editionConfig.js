import { editionJsonPublicPath } from './editionPaths.js';

export { editionJsonPublicPath, editionAssetStoragePath } from './editionPaths.js';

export const editionCode = import.meta.env.VITE_EDITION || 'cronache_disorganiche';

let editionCache = null;

export async function loadEdition(code = editionCode) {
  if (editionCache && code === editionCode) {
    return editionCache;
  }

  const response = await fetch(editionJsonPublicPath(code));
  if (!response.ok) {
    throw new Error(`Impossibile caricare edition.json per "${code}"`);
  }

  const data = await response.json();
  if (code === editionCode) {
    editionCache = data;
  }

  return data;
}
