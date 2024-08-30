---
title: "Installing Tailscale on a Robot Vacuum"
date: 2024-08-29
# lastmod: 2024-08-29
draft: true
description: "This is a new post about..."
featured: false
toc: true
reply: true
tags:
  - api
  - automation
  - homeassistant
  - linux
  - tailscale
---
As another step in my mission to *Tailscale all the things!*, I recently installed [Tailscale](/tags/tailscale) on my robot vacuum.

Okay, I didn't *just* install Tailscale on the robot. I also loaded it with software that lets me control it locally, freeing it from its cloud-based control.

I was inspired to give this a go after reading the [Tailscale sucks](https://tailscale.dev/blog/tailscale-sucks) post on the Tailscale developer blog. That post pointed me to a few very helpful projects:

- [Valetudo](https://valetudo.cloud/), a web-based front-end for robot vacuums by Sören Beye
- [DustBuilder](https://builder.dontvacuum.me/), a custom firmware builder for a variety of robot vacuums by Dennis Giese

In addition to the "product" provided by each of these projects, they are both also full of helpful knowledge.