import { getPublicUrlBase } from './resolveFramePath.mjs';
import { editionAssetStoragePath } from '../../src/editionPaths.js';

export { editionAssetStoragePath };

export async function loadEditionJson(editionCode) {
  if (!editionCode) {
    throw new Error('Edition code is required');
  }

  const url = `${getPublicUrlBase()}/editions/${encodeURIComponent(editionCode)}/edition.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load edition.json for "${editionCode}": HTTP ${response.status}`);
  }

  return response.json();
}
