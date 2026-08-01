import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const libDir = dirname(fileURLToPath(import.meta.url));

export function normalizeFrameRelativePath(framePathEnv) {
  if (!framePathEnv || typeof framePathEnv !== 'string') {
    throw new Error('Frame path is required');
  }

  let relative = framePathEnv.trim().replace(/^\/+/, '');
  if (relative.startsWith('public/')) {
    relative = relative.slice('public/'.length);
  }

  return relative;
}

function getPublicUrlBase() {
  return (
    process.env.VITE_PUBLIC_URL
    || process.env.URL
    || process.env.DEPLOY_PRIME_URL
    || 'http://localhost:8888'
  ).replace(/\/$/, '');
}

export function resolveFrameUrl(framePathEnv) {
  const relativePath = normalizeFrameRelativePath(framePathEnv);
  const encoded = relativePath.split('/').map(encodeURIComponent).join('/');
  return `${getPublicUrlBase()}/${encoded}`;
}

function getFilesystemCandidates(relativePath) {
  const roots = [
    join(libDir, '../..'),
    process.cwd(),
  ];

  return roots.map((root) => join(root, 'public', relativePath));
}

/** @deprecated Prefer loadFrameBuffer — filesystem path is unreliable in Netlify functions-serve */
export function resolveFramePath(framePathEnv) {
  return getFilesystemCandidates(normalizeFrameRelativePath(framePathEnv))[0];
}

export async function loadFrameBuffer(framePathEnv) {
  const relativePath = normalizeFrameRelativePath(framePathEnv);

  for (const filePath of getFilesystemCandidates(relativePath)) {
    if (existsSync(filePath)) {
      return readFile(filePath);
    }
  }

  const url = resolveFrameUrl(framePathEnv);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load frame from ${url}: HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
