---
title: "/changelog"
date: "2024-05-26T21:19:08Z"
lastmod: "2024-08-21T03:11:27Z"
description: "Maybe I should keep a log of all my site-related tinkering?"
featured: false
toc: false
timeless: true
categories: slashes
---
*Running list of config/layout changes to the site. The full changelog is of course [on GitHub](https://github.com/jbowdre/runtimeterror/commits/main/).*

**2024-08-20:**
- Added anchor links on section headings

**2024-08-15:**
- Implemented light/dark theme toggle

**2024-08-04:**
- Dynamically build `robots.txt` based on [ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt)

**2024-08-02:**
- Display "pinned" recent track in sidebar using [MusicThread](https://musicthread.app) instead of latest scrobble
- Tweak Typo behavior to avoid uncorrected mistakes near the end of the string

**2024-07-29:**
- Build `robots.txt` dynamically with [Dark Visitors API](https://darkvisitors.com/) and code from [Luke Harris](https://www.lkhrs.com/blog/2024/darkvisitors-hugo/)

**2024-07-03:**
- Remove `target="_blank"` from external links for improved security and accessibility

**2024-06-28:**
- Add [recentfm.js](https://recentfm.rknight.me/) recently-played widget to sidebar
- Use [Hugo render-hook](https://gohugo.io/render-hooks/links/#examples) to add ↗ marker to external links
- Redirect /uses and /saves to pages on the [personal blog](https://srsbsns.lol)

**2024-06-24:**
- Select the [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/?ref=chooser-v1) license
- Add a simple [upvote widget powered by Cabin](/kudos-with-cabin/) to posts

**2024-06-20:**
- Torchlight syntax highlighting tweaks:
  - Fix for line highlights not including all content when overflowing
  - Display diff indicators alongside line numbers

**2024-06-18:**
- Swap back to [Cabin](https://withcabin.com) analytics

**2024-06-13:**
- Add [Typo](https://neatnik.net/typo/) and a blinking cursor to the random error messages in the sidebar

**2024-06-06:**
- Migrate hosting from [Neocities to Bunny CDN](/further-down-the-bunny-hole/)

**2024-05-30:**
- Fix broken styling for taxonomy (categories/tags) feeds
- Open "notes" header link in new tab since it's an external link
- Misc improvements for handling /slashes

**2024-05-29:**
- Display post descriptions (if set) on archive pages; otherwise fall back to summaries
- Add [/slashes](/slashes/) archive page
- Add /slashes to top menu, add [/about](/about)

**2024-05-27:**
- Replace "powered by" links with slashpages

**2024-05-26:**
- Begin changelog *(earlier change dates extrapolated from posts)*
- Simplify logic for displaying kudos and post reply buttons
- Reduce gap for paragraphs followed by lists

**2024-04-30:**
- Implement [styling for RSS XML](/prettify-hugo-rss-feed-xslt/)

**2024-04-28:**
- Switch to [Berkeley Mono font face](/using-custom-font-hugo/)

**2024-02-19:**
- Dynamically generate [OG images](/dynamic-opengraph-images-with-hugo/)

**2024-01-21:**
- Migrate hosting from Netlify [to Neocities](/deploy-hugo-neocities-github-actions/)

**2023-11-09:**
- [Implement Torchlight](/spotlight-on-torchlight/) for syntax highlighting

**2023-09-13:**
- Rebrand from [virtuallypotato to runtimeterror](/virtuallypotato-runtimeterror/)

**2021-12-19:**
- Switch SSG from [Jekyll to Hugo](/hello-hugo/) and hosting from GitHub Pages to Netlify

**2021-07-20:**
- Migrate from [Hashnode to Jekyll on GitHub Page](/virtually-potato-migrated-to-github-pages/)