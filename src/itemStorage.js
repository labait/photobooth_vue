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

export function isWatermarkEnabled(watermarkEnv) {
  return isFrameEnabled(watermarkEnv);
}

export const ITEM_STATUS = {
  CREATED: 'created',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  ACCEPTED: 'accepted',
  NOT_ACCEPTED: 'not-accepted',
  FAILED: 'failed',
  HIDDEN: 'hidden',
};

export const ALL_ITEM_STATUSES = Object.values(ITEM_STATUS);

/** Item visibili in home e /list */
export function isPublicListStatus(status) {
  return status === ITEM_STATUS.ACCEPTED;
}

/**
 * Dettaglio per utenti non admin: accepted (pubblico) o processed (in attesa di conferma).
 */
export function canViewDetail(status, { isAdmin = false } = {}) {
  if (isAdmin) return true;
  return status === ITEM_STATUS.ACCEPTED || status === ITEM_STATUS.PROCESSED;
}

/** Generazione completata con immagine prodotta (conteggio limiti). */
export function isSuccessfulGeneration(item) {
  if (!item) return false;
  if (item.image_processed) return true;
  return (
    item.status === ITEM_STATUS.PROCESSED
    || item.status === ITEM_STATUS.ACCEPTED
    || item.status === ITEM_STATUS.NOT_ACCEPTED
    || item.status === ITEM_STATUS.HIDDEN
  );
}
