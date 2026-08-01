export function editionJsonPublicPath(code) {
  return `/editions/${code}/edition.json`;
}

/**
 * Path relative to public/ for frame, watermark, etc.
 * e.g. editions/totem1/frame1.png
 */
export function editionAssetStoragePath(code, relativeFile) {
  if (!relativeFile) return null;

  const file = String(relativeFile).trim().replace(/^\/+/, '');
  if (file.startsWith('editions/')) return file;
  if (file.startsWith('public/')) return file.slice('public/'.length);
  return `editions/${code}/${file}`;
}
