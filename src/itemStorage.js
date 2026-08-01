export const ITEM_IMAGE_FILES = {
  source: 'source.png',
  processed: 'processed.png',
  framed: 'framed.png',
};

export function itemStoragePath(edition, imageId, fileName) {
  return `${edition}/images/${imageId}/${fileName}`;
}

export function isFrameEnabled(frameEnv) {
  if (frameEnv == null) return false;

  const value = String(frameEnv).trim();
  if (!value) return false;

  const normalized = value.toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return true;
}

export const ITEM_STATUS = {
  CREATED: 'created',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
  HIDDEN: 'hidden',
};

export const DETAIL_PUBLIC_STATUSES = [
  ITEM_STATUS.PROCESSED,
  ITEM_STATUS.PROCESSING,
  ITEM_STATUS.CREATED,
];

export function isDetailStatusPublic(status) {
  return DETAIL_PUBLIC_STATUSES.includes(status);
}
