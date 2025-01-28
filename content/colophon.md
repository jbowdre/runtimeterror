---
title: "/colophon"
date: "2024-05-26T22:30:58Z"
lastmod: 2025-01-28 15:21:38-06:00
description: "There's a lot that goes into this site. Let me tell you how it works."
featured: false
toc: true
timeless: true
categories: slashes
---
*I don't consider myself to be a web developer, but I've learned a **ton** through the process of building/tweaking/maintaining this site. The [colophon](https://indieweb.org/colophon) provides a quick overview of what powers `runtimeterror.dev`.*

### This site...
- is built with [Hugo](https://gohugo.io/) based on the [risotto](https://github.com/joeroe/risotto) theme with many, many tweaks and customizations.
- uses the font face [Berkeley Mono](https://berkeleygraphics.com/typefaces/berkeley-mono/) ([details](/using-custom-font-hugo/)), and icons from [Font Awesome](https://fontawesome.com/) and [Fork Awesome](https://forkaweso.me/).
- performs syntax highlighting with [Torchlight](https://torchlight.dev) ([details](/spotlight-on-torchlight/)).
- provides site search with [lunr](https://lunrjs.com/) based on an implementation detailed by [Victoria Drake](https://victoria.dev/blog/add-search-to-hugo-static-sites-with-lunr/).
- fetches [ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt) to dynamically generate a [robots.txt](/robots.txt) discouraging AI scrapers with Hugo's [`resources.GetRemote` capability](https://gohugo.io/functions/resources/getremote/).
- leverages self-hosted [Bearlytics](https://github.com/HermanMartinus/bearlytics) for privacy-friendly minimalist analytics.
- fetches recently-played music from [MusicThread](https://musicthread.app/).
- displays my latest status from [omg.lol](https://home.omg.lol/referred-by/jbowdre).
- uses [RSS2HTML](https://rss2html.net/) to show recent posts from [my other blog](https://srsbsns.lol) in the sidebar.
- resolves via [Bunny DNS](https://bunny.net/dns/).
- is published to / hosted on [Bunny Storage](https://bunny.net/storage/) and [Bunny CDN](https://bunny.net/cdn/) with a [GitHub Actions workflow](//further-down-the-bunny-hole/).

The post content is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/); the site code is under the [MIT License](https://github.com/jbowdre/runtimeterror/blob/main/LICENSE).


Look behind the scenes at [github.com/jbowdre/runtimeterror](https://github.com/jbowdre/runtimeterror).
