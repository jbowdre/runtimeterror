---
title: "Publish Silverbullet Notes with Quartz"
date: 2024-09-28
# lastmod: 2024-09-28
draft: true
description: "This is a new post about..."
featured: false
toc: true
reply: true
categories: Self-Hosting
tags:
  - api
  - automation
  - caddy
  - cicd
  - selfhosting
  - tailscale
---
It's been about two months since I [switched](https://srsbsns.lol/is-silverbullet-the-note-keeping-silver-bullet/) my note-keeping efforts from [Obsidian](https://obsidian.md) to [SilverBullet](https://silverbullet.md/), and I've been really enjoying it. Being able to access and write my notes from any device with a web browser has been super convenient, and SilverBullet is packed with useful features (and easily extensible to add new ones) without feeling slow, bloated, or otherwise cumbersome. The container-based setup is also [easy to deploy](/silverbullet-self-hosted-knowledge-management/).

But one use case I hadn't yet migrated from Obsidian to SilverBullet was managing the notes I share publicly at [notes.runtimeterror.dev](https://notes.runtimeterror.dev) using [Quartz](https://quartz.jzhao.xyz/). I had set this up using a [public repo](https://github.com/jbowdre/notes/tree/867dde54f8a72d2d04bac140a4c54e64dd0f569b) containing the Quartz code with a dedicated (public) Obsidian vault folder [embedded within](https://github.com/jbowdre/notes/tree/867dde54f8a72d2d04bac140a4c54e64dd0f569b/content). Since the contents are just Markdown files I *could* simply edit them directly and cut out Obsidian altogether, but I could see myself struggling to keep up with the links between notes if I was editing them manually. I really wanted to find a way to use SilverBullet for my published notes too.

I played a bit with SilverBullet's [publishing plugin](https://silverbullet.md/Plugs/Pub), which would let me selectively publish notes in certain folders or bearing certain tags, but the HTML it produces is a bit sparse. I didn't want to give up the Quartz niceties like the auto-generated navigation menu and built-in search.

After a little experimentation I settled on an approach that I think works really well for my needs:
- SilverBullet syncs to a private repo via the [Git plug](https://silverbullet.md/Plugs/Git).
- Pushes to that private repo trigger a workflow run in my (public) Quartz repo.
- A workflow in the Quartz repo clones the private SilverBullet repo to `content/`.
- Quartz processes the Markdown files in the `content/` directory and renders HTML output to `public/`.
- The contents of `public/` are transferred to my server via Tailscale, and then served by Caddy.

This post will describe the entire setup in detail.


