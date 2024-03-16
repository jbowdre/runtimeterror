---
title: "Deploying a Hugo Site to Neocities with GitHub Actions"
date: 2024-01-21
# lastmod: 2024-01-21
description: "Using GitHub Actions to automatically deploy a Hugo website to Neocities."
featured: false
toc: true
comments: true
categories: Backstage
tags:
  - cicd
  - hugo
  - meta
  - serverless
---
I came across [Neocities](https://neocities.org) many months ago, and got really excited by the premise: a free web host with the mission to bring back the *"fun, creativity and independence that made the web great."* I spent a while scrolling through the [gallery](https://neocities.org/browse) of personal sites and was amazed by both the nostalgic vibes and the creativity on display. It's like a portal back to when the web was fun. Neocities seemed like something I wanted to be a part of so I signed up for an account... and soon realized that I didn't *really* want to go back to crafting artisinal HTML by hand like I did in the early '00s. I didn't see an easy way to leverage my preferred static site generator[^lazy] so I filed it away and moved on.

[^lazy]: Also I'm kind of lazy, and not actually very good at web design anyway. I mean, you've seen my work.

Until yesterday, when I saw a post from [Sophie](https://social.lol/@sophie) on [How I deploy my Eleventy site to Neocities](https://localghost.dev/blog/how-i-deploy-my-eleventy-site-to-neocities/). I hadn't realized that Neocities had an [API](https://neocities.org/api), or that there was a [deploy-to-neocities](https://github.com/bcomnes/deploy-to-neocities) GitHub Action which uses that API to push content to Neocities. With that new-to-me information, I thought I'd give Neocities another try - a real one this time.

I had been hosting this site on Netlify's free plan [for a couple of years](/hello-hugo/) and haven't really encountered any problems. But I saw Neocities as a better vision of the internet, and I wanted to be a part of that[^passion]. So last night I upgraded to the $5/month [Neocities Supporter](https://neocities.org/supporter) plan which would let me use a custom domain for my site (along with higher storage and bandwidth limits).

[^passion]: Plus I love supporting passion projects.

I knew I'd need to make some changes to Sophie's workflow since my site is built with Hugo rather than Eleventy. I did some poking around and found [GitHub Actions for Hugo](https://github.com/peaceiris/actions-hugo) which would take care of installing Hugo for me. Then I'd just need to render the HTML with `hugo --minify` and use the [Torchlight](/spotlight-on-torchlight/) CLI to mark up the code blocks. Along the way, I also discovered that I'd need to overwrite `/not_found.html` to insert my custom 404 page so I included an extra step to do that. After that, I'll finally be ready to push the results to Neocities.

It took a bit of trial and error, but I eventually adapted this workflow which does the trick:

### The Workflow
```yaml
# torchlight! {"lineNumbers": true}
# .github/workflows/deploy-to-neocities.yml
name: Deploy to Neocities

on:
  # Daily build to catch any future-dated posts
  schedule:
    - cron: 0 13 * * *
  # Build on pushes to the main branch only
  push:
    branches:
      - main

concurrency:
  group: deploy-to-neocities
  cancel-in-progress: true

defaults:
  run:
    shell: bash

jobs:
  deploy:
    name: Build and deploy Hugo site
    runs-on: ubuntu-latest
    steps:
      # Install Hugo in the runner
      - name: Hugo setup
        uses: peaceiris/actions-hugo@v2.6.0
        with:
          hugo-version: '0.121.1'
          extended: true
      # Check out the source for the site
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
      # Build the site with Hugo
      - name: Build with Hugo
        run: hugo --minify
      # Copy my custom 404 page to not_found.html so it
      # will be picked up by Neocities
      - name: Insert 404 page
        run: |
          cp public/404/index.html public/not_found.html
      # Highlight code blocks with the Torchlight CLI
      - name: Highlight with Torchlight
        run: |
          npm i @torchlight-api/torchlight-cli
          npx torchlight
      # Push the rendered site to Neocities and
      # clean up any orphaned files
      - name: Deploy to Neocities
        uses: bcomnes/deploy-to-neocities@v1
        with:
          api_token: ${{ secrets.NEOCITIES_API_TOKEN }}
          cleanup: true
          dist_dir: public
```

I'm thrilled with how well this works, and happy to have learned a bit more about GitHub Actions in the process. Big thanks to Sophie for pointing me in the right direction!