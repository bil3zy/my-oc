---
name: deploy-to-preprod
description: Use when deploying bahu-project to preprod environment on VPS
---

# Deploy to Preprod

## Overview

Deploys bahu-front (Angular), bahu-front-manager, and bahu-back to preprod VPS at `185.245.182.173`. Deploys to `/srv/releases/` with timestamp-based directories.

**TIMESTAMP is generated on VPS first.** Local side builds and sends artifacts. VPS side extracts and configures.

## Prerequisites

- SSH access to `root@185.245.182.173`
- Local `.tar.gz` artifacts ready for transfer
- VPS has `pm2`, `nginx` configured

## Deployment Order

1. **Backend** (Node.js with pm2)
2. **Frontend** (Angular staging build)
3. **Manager** (Angular staging build)
4. **Elasticsearch** (data restore if needed)

## Backend Deployment

### Local Side

```bash
tar --exclude=src/config.js \
    --exclude=src/utils/propertyoffers \
    --exclude=src/utils/banners \
    --exclude=src/utils/storyviews \
    --exclude=src/utils/companies \
    --exclude='node_modules/*' \
    -czvf backend.tar.gz -C . .

scp backend.tar.gz root@185.245.182.173:/srv/
```

### VPS Side

```bash
TIMESTAMP=$(date +'%Y%m%d-%H%M%S')
cd /srv/
mkdir releases/back/$TIMESTAMP
mv bahu-back releases/back/$TIMESTAMP
mkdir bahu-back
tar -xzf backend.tar.gz -C bahu-back
cd bahu-back/src && rm -rf config.js
cp ../../releases/back/$TIMESTAMP/bahu-back/src/config.js .
cd utils
cp -r ../../../releases/back/$TIMESTAMP/bahu-back/src/utils/propertyoffers/ .
cp -r ../../../releases/back/$TIMESTAMP/bahu-back/src/utils/banners/ .
cp -r ../../../releases/back/$TIMESTAMP/bahu-back/src/utils/companies/ .
cp -r ../../../releases/back/$TIMESTAMP/bahu-back/src/utils/storyviews/ .
cd .. && npm install
pm2 restart all
```

## Frontend Deployment

### Local Side

```bash
npx ng build --configuration=staging
rm -rf front-dist.tar.gz
tar -czvf front-dist.tar.gz -C dist/ .
scp front-dist.tar.gz root@185.245.182.173:/srv/
```

### VPS Side

```bash
TIMESTAMP=$(date +'%Y%m%d-%H%M%S')
cd /srv/
mkdir releases/front/$TIMESTAMP
mv bahu-front-dist releases/front/$TIMESTAMP
mkdir bahu-front-dist
tar -xzf front-dist.tar.gz -C bahu-front-dist
sudo systemctl reload nginx
```

## Manager Deployment

### Local Side

```bash
npx ng build --configuration=staging
rm -rf manager-dist.tar.gz
tar -czvf manager-dist.tar.gz -C dist/ .
scp manager-dist.tar.gz root@185.245.182.173:/srv/
```

### VPS Side

```bash
TIMESTAMP=$(date +'%Y%m%d-%H%M%S')
cd /srv/
mkdir releases/manager/$TIMESTAMP
mv bahu-front-manager-dist releases/manager/$TIMESTAMP
mkdir bahu-front-manager-dist
tar -xzf manager-dist.tar.gz -C bahu-front-manager-dist
sudo systemctl reload nginx
```

## Elasticsearch Restore

If indices need restoring:

```bash
elasticdump --input=all_indices_dump.json --output=http://preprod.bahu.ly:9200/ --type=data
```

## Rollback

To rollback to a previous release:

```bash
# On VPS - find previous timestamp
ls /srv/releases/back/

# Symlink to previous release
ln -sfn /srv/releases/back/<previous-timestamp>/bahu-back /srv/bahu-back
pm2 restart all
```

## Quick Reference

| Component | Local Command | VPS Directory |
|-----------|--------------|---------------|
| Backend | `tar ... && scp` | `/srv/releases/back/<timestamp>/bahu-back` |
| Frontend | `ng build staging && tar && scp` | `/srv/releases/front/<timestamp>/bahu-front-dist` |
| Manager | `ng build staging && tar && scp` | `/srv/releases/manager/<timestamp>/bahu-front-manager-dist` |
| Nginx | - | `sudo systemctl reload nginx` |
| PM2 | - | `pm2 restart all` |