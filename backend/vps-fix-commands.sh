#!/bin/bash

# Direct VPS commands to fix batch.controller.ts
# Copy and paste these commands one by one on your VPS

cd /var/www/primeacademy_backend

# Backup first
cp src/controllers/batch.controller.ts src/controllers/batch.controller.ts.backup

# Fix 1: Make Course include conditional in getAllBatches (around line 1205)
# Find the section and replace it
sed -i '/\/\/ Get all batches with related data/,/order: \[\[.createdAt/d' src/controllers/batch.controller.ts

# Actually, let's use a simpler approach - use sed to comment out Course includes
# and add conditional checks

# For getAllBatches - comment out Course include and add conditional
sed -i 's/        {/        \/\/ {/g; s/model: db\.Course,/\/\/ model: db.Course,/g' src/controllers/batch.controller.ts

# This is getting complex with sed. Let me provide a better solution using a patch file approach

