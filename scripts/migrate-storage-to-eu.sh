#!/usr/bin/env bash
# Copia tutti i file da Firebase Storage (bucket default) al bucket EU,
# mantenendo la stessa struttura di cartelle e sottocartelle.
#
# Uso:
#   ./scripts/migrate-storage-to-eu.sh           # esegue la copia
#   ./scripts/migrate-storage-to-eu.sh --dry-run # simula senza copiare
#
# Prerequisiti: gcloud/gsutil autenticati con accesso al progetto.

set -euo pipefail

SOURCE_BUCKET="gs://photobooth-laba-2ca9f.firebasestorage.app"
DEST_BUCKET="gs://photobooth-laba-2ca9f"
PROJECT_ID="photobooth-laba-2ca9f"

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

echo "=== Migrazione Firebase Storage → EU ==="
echo "  Sorgente:  $SOURCE_BUCKET"
echo "  Destinaz.: $DEST_BUCKET"
echo ""

if ! command -v gsutil >/dev/null 2>&1; then
  echo "Errore: gsutil non trovato. Installa Google Cloud SDK."
  exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
  echo "Errore: gcloud non autenticato. Esegui: gcloud auth login"
  exit 1
fi

gcloud config set project "$PROJECT_ID" >/dev/null

echo "Cartelle in sorgente:"
gsutil ls "$SOURCE_BUCKET/" || true
echo ""

RSYNC_ARGS=(-m rsync -r)
if $DRY_RUN; then
  RSYNC_ARGS+=(-n)
  echo "Modalità dry-run: nessun file verrà copiato."
fi

echo "Avvio rsync (struttura cartelle preservata)..."
gsutil "${RSYNC_ARGS[@]}" "$SOURCE_BUCKET" "$DEST_BUCKET"

echo ""
echo "=== Completato ==="
echo "Verifica:"
echo "  gsutil ls $DEST_BUCKET/images/"
echo "  gsutil ls $DEST_BUCKET/posters/"
echo ""
echo "Prossimi passi:"
echo "  1. Imposta VITE_FIREBASE_STORAGE_BUCKET=photobooth-laba-2ca9f in .env e su Netlify"
echo "  2. Rideploya l'app"
echo "  3. (Opzionale) In Firebase Console → Storage, usa il bucket EU per i nuovi upload"
