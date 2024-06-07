---
title: "/colophon"
date: "2024-05-26T22:30:58Z"
lastmod: "2024-06-06"
description: "There's a lot that goes into this site. Let me tell you how it works."
featured: false
toc: true
timeless: true
categories: slashes
---
*I don't consider myself to be a web developer, but I've learned a **ton** through the process of building/tweaking/maintaining this site. The [colophon](https://indieweb.org/colophon) provides a quick overview of what powers `runtimeterror.dev`.*

### This site...
- is built with [Hugo](https://gohugo.io/) using the [risotto](https://github.com/joeroe/risotto) theme with many, many tweaks and customizations.
- uses the font face [Berkeley Mono](https://berkeleygraphics.com/typefaces/berkeley-mono/) ([details](/using-custom-font-hugo/)).
- performs syntax highlighting with [Torchlight](https://torchlight.dev) ([details](/spotlight-on-torchlight/)).
- provides site search with [lunr](https://lunrjs.com/) based on an implementation detailed by [Victoria Drake](https://victoria.dev/blog/add-search-to-hugo-static-sites-with-lunr/).
- leverages [tinylytics](https://tinylytics.app/) for privacy-friendly analytics and cute kudos buttons.
- resolves via [Bunny DNS](https://bunny.net/dns/).
- is published to / hosted by [Bunny CND](https://bunny.net/cdn/) with a GitHub Actions workflow.
- has a [Gemini](https://geminiprotocol.net) mirror at `gemini://gmi.runtimeterror.dev`. This is generated from a [Hugo gemtext post layout](https://github.com/jbowdre/runtimeterror/blob/main/layouts/_default/single.gmi), deployed to a [Vultr](https://www.vultr.com/) VPS through a GitHub Actions workflow, and served with [Agate](https://github.com/mbrubeck/agate).


Look behind the scenes at [github.com/jbowdre/runtimeterror](https://github.com/jbowdre/runtimeterror).
