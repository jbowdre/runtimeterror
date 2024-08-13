---
title: "SilverBullet: A Brilliant Self-Hosted Knowledge Management Web App"
date: 2024-08-12
# lastmod: 2024-08-12
draft: true
description: "This is a new post about..."
featured: false
toc: true
reply: true
categories: Self-Hosting
tags:
  - cloudflare
  - containers
  - docker
  - javascript
  - linux
  - selfhosting
  - tailscale
  ---

A few days ago I [posted on my other blog](https://srsbsns.lol/is-silverbullet-the-note-keeping-silver-bullet/) about trying out [SilverBullet](https://silverbullet.md), an open-source self-hosted web-based note-keeping app. SilverBullet has continued to impress me as I use it and learn more about its [features](https://silverbullet.md/SilverBullet@1992). It really fits my multi-device use case much better than Obsidian ever did (even with its paid sync plugin).

In that post, I shared a brief overview of how I set up SilverBullet:

> I deployed my instance in Docker alongside both a [Tailscale sidecar](/tailscale-serve-docker-compose-sidecar/) and [Cloudflare Tunnel sidecar](/publish-services-cloudflare-tunnel/). This setup lets me easily access/edit/manage my notes from any device I own by just pointing a browser at `https://silverbullet.tailnet-name.ts.net/`. And I can also hit it from any *other* device by using the public Cloudflare endpoint which is further protected by an email-based TOTP challenge. Either way, I don't have to worry about installing a bloated app or managing a complicated sync setup. Just log in and write.

This post will go into a bit more detail about the configuration.

### Docker Prep
I chose to deploy SilverBullet on an Ubuntu 22.04 VM in my [homelab](/homelab/) which was already set up for serving Docker workloads so I'm not going to cover the Docker [installation process](https://docs.docker.com/engine/install/ubuntu/) here. I tend to run my Docker workloads out of `/opt/` so I started this journey by creating a place to hold the SilverBullet setup:

```shell
sudo mkdir -p /opt/silverbullet # [tl! .cmd]
```

I set up appropriate ownership of the folder and then entered it:

```shell
sudo chown john:docker /opt/silverbullet # [tl! .cmd:1]
cd /opt/silverbullet
```

### Docker Compose

```yaml
services:
  tailscale:
    image: tailscale/tailscale:latest
    container_name: silverbullet-tailscale
    restart: unless-stopped
    environment:
      TS_AUTHKEY: ${TS_AUTHKEY:?err}
      TS_HOSTNAME: ${TS_HOSTNAME:-ts-docker}
      TS_EXTRA_ARGS: ${TS_EXTRA_ARGS:-}
      TS_STATE_DIR: /var/lib/tailscale/
      TS_SERVE_CONFIG: /config/serve-config.json
    volumes:
      - ./ts_data:/var/lib/tailscale/
      - ./serve-config.json:/config/serve-config.json

  cloudflared:
    image: cloudflare/cloudflared
    restart: unless-stopped
    container_name: silverbullet-cloudflared
    command:
      - tunnel
      - run
      - --token
      - ${CLOUDFLARED_TOKEN}
    network_mode: service:tailscale

  silverbullet:
    image: zefhemel/silverbullet
    container_name: silverbullet
    restart: unless-stopped
    environment:
      SB_USER: "${SB_CREDS}"
    volumes:
      - ./space:/space
    network_mode: service:tailscale

  watchtower:
    image: containrrr/watchtower
    container_name: silverbullet-watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```
