---
title: "Deploy Hugo Neocities Github Actions"
date: 2024-01-21
# lastmod: 2024-01-21
draft: true
description: "This is a new post about..."
featured: false
toc: true
comments: true
categories: Backstage
tags:
  - hugo
  - meta
---
Neocities: https://neocities.org/about

Supporter: https://neocities.org/supporter

Netlify pricing: https://www.netlify.com/pricing/#core-pricing-table

| | Neocities (free) | Neocities ($5/mo) | Netlify (free) | Netlify ($19/mo) |
| --- | --- | --- | --- | --- |
| Storage | 1 GB | 50 GB | - | - |
| Bandwidth | 200 GB | 3000 TB | 100 GB | 1000 TB |
| Global CDN | ✅ | ✅ | ✅ | ✅ |
| Analytics | ✅ | ✅ | $9/mo | $9/mo |
| One-Click Backups | ✅ | ✅ | - | - |
| Email Support | - | ✅ | - | ✅ |
| Supports a free web | - | ✅ | - | - |


Sophie's post: https://localghost.dev/blog/how-i-deploy-my-eleventy-site-to-neocities/

Action: https://github.com/bcomnes/deploy-to-neocities

Hugo starter workflow: https://github.com/actions/starter-workflows/blob/main/pages/hugo.yml


```yaml
# torchlight! {"lineNumbers": true}
# .github/workflows/deploy-to-neocities.yml
name: Deploy to neocities

# only run on changes to main
on:
  push:
    branches:
      - main

concurrency: # prevent concurrent deploys doing strange things
  group: deploy-to-neocities
  cancel-in-progress: true

# Default to bash
defaults:
  run:
    shell: bash

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: "0.121.1"
    steps:
      - name: Install Hugo CLI
        run: |
          wget -O ${{ runner.temp }}/hugo.deb https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.deb \
          && sudo dpkg -i ${{ runner.temp }}/hugo.deb
      - name: Install Dart Sass
        run: sudo snap install dart-sass
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
      - name: Install Node.js dependencies
        run: "[[ -f package-lock.json || -f npm-shrinkwrap.json ]] && npm ci || true"
      - name: Build with Hugo
        env:
          # For maximum backward compatibility with Hugo modules
          HUGO_ENVIRONMENT: production
          HUGO_ENV: production
        run: |
          hugo \
            --minify \
            --baseURL "https://runtimeterror.dev/"
      - name: Highlight with Torchlight
        run: |
          npm i @torchlight-api/torchlight-cli
          npx torchlight
      - name: Deploy to neocities
        uses: bcomnes/deploy-to-neocities@v1
        with:
          api_token: ${{ secrets.NEOCITIES_API_TOKEN }}
          cleanup: false
          dist_dir: public
```

