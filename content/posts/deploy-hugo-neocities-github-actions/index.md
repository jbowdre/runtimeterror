---
title: "Deploying a Hugo Site to Neocities with GitHub Actions"
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
  - serverless
---
I came across [Neocities](https://neocities.org) many months ago, and got really excited by the premise: a free web host with the mission to bring back "the fun, creativity and independence that made the web great." I spent a while scrolling through the [gallery](https://neocities.org/browse) of personal sites and was amazed by both the nostalgia and the creativity on display. It's like a portal that took me back to when the web was fun. It sounded like something I wanted to be a part of, so I signed up for an account... and promptly realized that I didn't *really* want to go back to manually crafting HTML like I did with the sites I created in the early 2000s. I didn't see an easy way to connect my preferred static site generator, and I'm kind of lazy, so I stopped.

See, I was pretty happy with my existing publishing setup. I write posts in Markdown and commit/push those changes to GitHub. I've got [Netlify](https://netlify.com/) set up to watch my repo for changes, and when a `push` happens it springs into action. Netlify grabs the content of my repo, uses [Hugo](https://gohugo.io/) to render it to HTML, calls [Torchlight](/spotlight-on-torchlight/) to dress up the code blocks, and then serves the result through Netlify's global CDN. This process is automatic and reliable - and using an SSG like Hugo means I don't have to wrangle HTML with my bare hands.[^wrangling]

[^wrangling]: Though, admittedly, I've spent most of my free time this last week tinkering with HTML templates and fiddling with CSS bits... but that was for fun, dangit!

But then I joined the [omg.lol](https://home.omg.lol/) community a month or so ago, and that exposed me to some brilliant web developers doing awesome things in the name of an [independent, personal web](https://indieweb.org/). Seeing what other omg.lol members were doing with their personal web spaces inspired me to see if I could do a bit more with mine... and I've done a *lot* of small housekeeping improvements in that time. I implemented full-text RSS feeds (and deployed a [self-hosted feed reader](/tailscale-serve-docker-compose-sidecar/#miniflux) to follow other blogs), switched to using [tinylytics](https://tinylytics.app/) for analytics (and a slick no-account-needed Kudos button on each post), did a lot of reorganizing things, and performed a lot of other little tweaks along the way.

And yesterday, I saw a post from [Sophie](https://social.lol/@sophie) titled [How I deploy my Eleventy site to Neocities](https://localghost.dev/blog/how-i-deploy-my-eleventy-site-to-neocities/). Until reading her post, I hadn't realized that Neocities had an [API](https://neocities.org/api), or that there was a [deploy-to-neocities](https://github.com/bcomnes/deploy-to-neocities) GitHub Action which could use that API to push content to Neocities. With that new-to-me information, I quickly decided that I wanted to go ahead and make this change.

Like I mentioned earlier, I didn't really have any complaints with Netlify, and I never came anywhere close to the bandwidth limits of the free plan. But I saw Neocities as a better vision of the internet, and I wanted to be a part of that. So I signed up for the $5/month [Neocities Supporter](https://neocities.org/supporter) plan so I could bring in my own domain *and* to support their vision.

Then I followed Sophie's instructions to obtain my Neocities API token and store it as a repository secret called `NEOCITIES_API_TOKEN`.

From there, I knew I'd need to make some changes to her workflow since I build my site with Hugo rather than Eleventy. I did some poking around and found [GitHub Actions for Hugo](https://github.com/peaceiris/actions-hugo) which would take care of installing Hugo for me. After some trial and error, I came up with this workflow:


```yaml
# torchlight! {"lineNumbers": true}
# .github/workflows/deploy-to-neocities.yml
name: Deploy to Neocities

on:
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
      - name: Hugo setup
        uses: peaceiris/actions-hugo@v2.6.0
        with:
          hugo-version: '0.121.1'
          extended: true
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
      - name: Build with Hugo
        run: hugo --minify
      - name: Insert 404 page
        run: |
          cp public/not_found/index.html public/not_found.html
      - name: Highlight with Torchlight
        run: |
          npm i @torchlight-api/torchlight-cli
          npx torchlight
      - name: Deploy to Neocities
        uses: bcomnes/deploy-to-neocities@v1
        with:
          api_token: ${{ secrets.NEOCITIES_API_TOKEN }}
          cleanup: true
          dist_dir: public
```

