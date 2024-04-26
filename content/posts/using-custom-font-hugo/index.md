---
title: "Configuring a Custom Font in Hugo, with Cloudflare R2 and Tailscale"
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
The [risotto theme for Hugo](https://github.com/joeroe/risotto/tree/main) upon which this site is based defines the default font face(s) as the variable `--font-monospace` in `themes/risotto/static/css/typography.css`, and then that variable is inserted wherever the font may need to be set:

```css
/* torchlight! {"lineNumbers":true} */
/* Fonts */
:root {
    --font-monospace: "Fira Mono", monospace; /* [tl! **] */
}

body {
    font-family: var(--font-monospace); /* [tl! **] */
    font-size: 16px;
    line-height: 1.5rem;
}
```

This makes it easy to override the theme's font by referencing my preferred font in `static/custom.css`:

```css
/* font overrides */
:root {
  --font-monospace: 'Berkeley Mono', 'Fira Mono', monospace; /* [tl! **] */
}
```

And that would be the end of things if I could expect that everyone who visited my site already had the Berkeley Mono font installed; if they don't, though, the site will fallback to either the Fira Mono font or whatever generic monospace font is on the system. So maybe I'll add a few other monospace fonts just for good measure:

```css
/* font overrides */
:root {
  --font-monospace: 'Berkeley Mono', 'IBM Plex Mono', 'Cascadia Mono', 'Roboto Mono', 'Source Code Pro', 'Fira Mono', 'Courier New', monospace; /* [tl! **] */
}
```

That gives me a few more fallback fonts to fall back to if my preferred font isn't available. But let's see about making that font available.

#### Hosted Locally
I can use a `@font-face` rule to tell the browser how to find the `.woff2`/`.woff` files for my preferred web font, and I could just set the `src: url` parameter to point to a local path in my Hugo environment:

```css
/* load preferred font */
@font-face {
  font-family: 'Berkeley Mono';
  font-style: normal;
  font-weight: 400;
  src: local('Berkeley Mono'),
    url('/fonts/BerkeleyMono.woff2') format('woff2'),
    url('/fonts/BerkeleyMono.woff') format('woff')
}
```

And that would work just fine... but it *would* require storing those web font files in the GitHub repo which powers my site, and I'd rather not host any paid font files in such a way.

So instead, I opted to store the web font files in [Cloudflare's R2 S3-compatible object storage](https://www.cloudflare.com/developer-platform/r2/); this would allow me to control access somewhat (okay, just a little bit), and give me an excuse to play with R2 a bit and make use of a cool `cdn.runtimeterror.dev` subdomain the process.

#### Hosted on R2
Getting started with R2 was really easy; I just [created a new R2 bucket](https://developers.cloudflare.com/r2/buckets/create-buckets/) called `runtimeterror` and [connected it to the custom domain](https://developers.cloudflare.com/r2/buckets/public-buckets/#connect-a-bucket-to-a-custom-domain) `cdn.runtimeterror.dev`. I put the two web font files in a folder titled `fonts` and uploaded them to the bucket so that they can be accessed under `https://cdn.runtimeterror.dev/fonts/`.

I could then employ a [Cross-Origin Resource Sharing (CORS)](https://developers.cloudflare.com/r2/buckets/cors/) policy to ensure the fonts hosted on my fledgling CDN can only be loaded on my site. I configured the policy to also allow access from my `localhost` Hugo build environment as well as a preview Neocities environment I use for testing such major changes:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:1313",
      "https://secret--runtimeterror--preview.neocities.org",
      "https://runtimeterror.dev"
    ],
    "AllowedMethods": [
      "GET"
    ]
  }
]
```

Then I just needed to update the `@font-face` rule accordingly:

```css
/* load preferred font */
@font-face {
  font-family: 'Berkeley Mono';
  font-style: normal;
  font-weight: 400;
  font-display: fallback; /* [tl! ++] */
  src: local('Berkeley Mono'),
    url('/fonts/BerkeleyMono.woff2') format('woff2'), /* [tl! --] */
    url('https://cdn.runtimeterror.dev/fonts/BerkeleyMono.woff2') format('woff2'), /* [tl! ++] */
    url('/fonts/BerkeleyMono.woff') format('woff') /* [tl! --] */
    url('https://cdn.runtimeterror.dev/fonts/BerkeleyMono.woff') format('woff') /* [tl! ++] */
}
```

I added in the `font-display: fallback;` descriptor to address the fact that the site will now be loading a remote font. Rather than blocking and not rendering text until the preferred font is loaded, it will show text in one of the available fallback fonts. If the preferred font loads quickly enough, it will be swapped in; otherwise, it will just show up on the next page load. I figured this was a good middle-ground between wanting the site to load quickly while also looking the way I want it to.

To test my work, I ran `hugo server` to build and serve the site locally on `http://localhost:1313`... and promptly encountered a cascade of CORS-related errors. I kept tweaking the policy and trying to learn more about what I'm doing (reminder: I'm bad at this), but just couldn't figure out what was preventing the font from being loaded.

I *eventually* discovered that sometimes you need to clear Cloudflare's cache so that new policy changes will take immediate effect. Once I [purged everything](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-everything/), the errors went away and the font loaded successfully.

So that's the web font for the web site sorted; now let's tackle the font in the dynamically-generated OpenGraph share images.

### OpenGraph Image Filter Text


/gemini-capsule-gempost-github-actions/#publish-github-actions:~:text=name%3A%20Connect%20to%20Tailscale