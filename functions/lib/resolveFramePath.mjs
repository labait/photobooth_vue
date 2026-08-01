import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function resolveFramePath(framePathEnv) {
  if (!framePathEnv || typeof framePathEnv !== 'string') {
    throw new Error('Frame path is required');
  }

  let relative = framePathEnv.trim().replace(/^\/+/, '');
  if (relative.startsWith('public/')) {
    relative = relative.slice('public/'.length);
  }

  return join(projectRoot, 'public', relative);
}
