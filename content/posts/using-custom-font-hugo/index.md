---
title: "Using a Custom Font in Hugo"
date: 2024-04-23
# lastmod: 2024-04-23
draft: true
description: "This is a new post about..."
featured: false
toc: true
comments: true
categories: Tips # Backstage, ChromeOS, Code, Self-Hosting, VMware
tags:
  - cloudflare
  - hugo
  - meta
  - tailscale
---
Last week, I came across and immediately fell in love with a delightfully-retro monospace font called [Berkeley Mono](https://berkeleygraphics.com/typefaces/berkeley-mono/). I promptly purchased a "personal developer" license and set to work [applying the font in my IDE and terminal](https://scribbles.jbowdre.lol/post/trying-tabby-terminal). I didn't want to stop there, though; the license also permits me to use the font on my personal site, and Berkeley Mono will fit in beautifully with the whole runtimeterror aesthetic.

Long story short, you're looking at a slick new font here. Long story long: I'm about to tell you how I added the font both to the site and to the [dynamically-generated OpenGraph share images](/dynamic-opengraph-images-with-hugo/) setup. It wasn't terribly hard to implement, but the Hugo documentation is a bit light on how to do it (and I'm kind of inept at this whole web development thing).

### Web Font
Rather than simply store the `.woff`/`.woff2` font files directly


### OpenGraph Image Filter Text
/gemini-capsule-gempost-github-actions/#publish-github-actions:~:text=name%3A%20Connect%20to%20Tailscale