#!/bin/bash
# Simple Firestore export using gcloud
COLLECTION=questions
OUTPUT=backup-$(date +%F).json

if ! command -v gcloud >/dev/null; then
  echo "gcloud CLI is required" >&2
  exit 1
fi

gcloud firestore export --collection-ids=$COLLECTION gs://your-bucket/exports/
# Optionally download
# gsutil cp gs://your-bucket/exports/latest/$COLLECTION* .

