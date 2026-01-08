#!/bin/bash
# Run this on Render to add image column to Post table
# Go to Render Dashboard → Your service → Shell → Run this command:

psql $DATABASE_URL -c "ALTER TABLE \"Post\" ADD COLUMN IF NOT EXISTS \"image\" TEXT;"
echo "✅ Image column added successfully"
