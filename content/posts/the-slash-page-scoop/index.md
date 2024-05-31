---
title: "The Slash Page Scoop"
date: 2024-05-30
# lastmod: 2024-05-30
draft: true
description: "I've added new slash pages to the site to share some background info on who I am, what I use, and how this site works."
featured: false
toc: true
reply: true
categories: Backstage
tags:
  - hugo
  - meta
---
Inspired by [Robb Knight](https://rknight.me/)'s recent [slash pages](https://slashpages.net/) site, I spent some time over the past week or two drafting some slash pages of my own.

> Slash pages are common pages you can add to your website, usually with a standard, root-level slug like `/now`, `/about`, or `/uses`. They tend to describe the individual behind the site and are distinguishing characteristics of the IndieWeb.

The pages that I've implemented (so far) include:
- [/about](/about) tells a bit about me and my background
- [/changelog](/changelog) is just *starting* to record some of visual/functional changes I make here
- [/colophon](/colophon) describes the technology and services used in producing/hosting this site
- [/homelab](/homelab) isn't a canonical slash page but it provides a lot of details about my homelab setup
- [/save](/save) shamelessly hosts referral links for things I love and think you'll love too
- [/uses](/uses) shares the stuff I use on a regular basis

And, of course, these are collected in one place at [/slashes](/slashes).

Feel free to stop here if you just want to check out the slash pages, or keep on reading for some nerd stuff about how I implemented them on my Hugo site.

### Implementation
All of my typical blog posts get created within the site's Hugo directory under `content/posts/`, like this one at `content/posts/the-slash-page-scoop/index.md`. They get indexed, automatically added to the list of posts on the home page, and show up in the RSS feed. I don't want my slash pages to get that treatment so I made them directly inside the `content` directory:

```
content
├── categories
├── posts
├── search
├── 404.md
├── _index.md
├── about.md [tl! ~~]
├── changelog.md  [tl! ~~]
├── colophon.md  [tl! ~~]
├── homelab.md  [tl! ~~]
├── save.md  [tl! ~~]
├── simplex.md
└── uses.md  [tl! ~~]
```

Easy enough, but I didn't then want to have to worry about manually updating a list of slash pages so I used [Hugo's Taxonomies](https://gohugo.io/content-management/taxonomies/) feature for that. I simpled tagged each page with a new `slashes` category by adding it to the post's front matter:

```yaml
---
title: "/changelog"
date: "2024-05-26"
lastmod: "2024-05-30"
description: "Maybe I should keep a log of all my site-related tinkering?"
featured: false
toc: false
timeless: true
categories: slashes # [tl! ~~]
---
```

