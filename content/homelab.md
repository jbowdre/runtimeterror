---
title: "/homelab"
date: "2024-05-26T21:30:51Z"
lastmod: 2025-03-10 21:43:48-05:00
aliases:
  - playground
description: "The systems I use for fun and enrichment."
featured: false
toc: true
timeless: true
categories: slashes
---
*I enjoy tinkering with small technology projects, and I learn a ton from these experiments. I also self-host a number of apps/services from my home as well as various cloud environments. This page describes some of my technical playground.*

Everything is connected to my [Tailscale](https://tailscale.com) tailnet, with a GitOps-managed ACL to allow access as needed. This lets me access and manage systems without really caring if they're local or remote. [Tailscale is magic](/secure-networking-made-simple-with-tailscale/).

The Docker containers are (generally) managed with [Portainer](https://www.portainer.io/) using configs hosted [on my Forgejo instance](https://git.vim.wtf/wq/compositions).

### On Premise

**Proxmox VE 8 Cluster**
- 1x [Intel NUC 9 Extreme (NUC9i9QNX)](https://www.amazon.com/Intel-Extreme-NUC9i9QNX-Single-Model/dp/B0851JV4R8)
  - 9th Gen Intel® Core™ i9-9980HK (8 cores @ 2.40GHz)
  - 64GB RAM
  - 1x 512GB NVMe system drive
  - 2x 1TB NVMe drives (ZFS)
- 2x [HP Elite Mini 800 G9](https://www.hp.com/us-en/shop/pdp/hp-elite-mini-800-g9-desktop-pc-p-88u16ua-aba-1)
  - 12th Gen Intel® Core™ i7-12700 (8 cores @ 2.10GHz, 4 cores @ 1.60GHz)
  - 96GB RAM
  - 1x 512GB NVMe system drive
  - 1x 2TB NVMe drive (ZFS)
- [Unifi USW Flex XG 10GbE Switch](https://store.ui.com/us/en/collections/unifi-switching-utility-10-gbps-ethernet/products/unifi-flex-xg)
- [APC Back-UPS Pro 1500VA](https://www.apc.com/us/en/product/BR1500G/)

The Proxmox cluster hosts a number of VMs and LXC containers:
- `swarm`: 3-node Docker Swarm cluster for various on-prem container workloads, served via [TSDProxy](https://almeidapaulopt.github.io/tsdproxy/) / [Caddy + Tailscale](/caddy-tailscale-alternative-cloudflare-tunnel/):
  - [Calibre Web](https://github.com/janeczku/calibre-web) for managing my ebooks ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/calibre/compose.yaml))
  - [Cyberchef](https://github.com/gchq/CyberChef), the Cyber Swiss Army Knife ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/cyberchef/compose.yaml))
  - [Hashicorp Vault](https://www.vaultproject.io/) for secrets management ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/vault/compose.yaml))
  - [Heimdall](https://github.com/linuxserver/Heimdall), an application dashboard and launcher ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/heimdall/compose.yaml))
  - [IT-Tools](https://github.com/CorentinTh/it-tools) for handy online development-related tools ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/it-tools/compose.yaml))
  - [Linkding](https://github.com/sissbruecker/linkding) bookmark manager serving [links.bowdre.net](https://links.bowdre.net/bookmarks/shared) ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/linkding/compose.yaml))
  - [Opengist](https://github.com/thomiceli/opengist), an open-source alternative to GitHub's Gists ([post](https://srsbsns.lol/opening-up-opengist/), [compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/opengist/compose.yaml))
  - [phpIPAM](https://github.com/phpipam/phpipam), open-source IP address management ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/phpipam/compose.yaml))
  - [RIPE Atlas Probe](https://www.ripe.net/analyse/internet-measurements/ripe-atlas/) for measuring internet connectivity ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/ripe-atlas/compose.yaml))
  - [SilverBullet](https://silverbullet.md), a web-based personal knowledge management system ([post](/publish-silverbullet-notes-quartz/), [compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/silverbullet/compose.yaml))
  - [Tailscale Golink](https://github.com/tailscale/golink), a private shortlink service ([post](/tailscale-golink-private-shortlinks-tailnet/), [compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/golink/compose.yaml))
- `doc`: Ubuntu 22.04 Docker host for running containers outside of Swarm:
  - [GoToSocial](https://gotosocial.org/) to host my (old) personal Mastodon-compatible ActivityPub server, [goto.srsbsns.lol](https://goto.srsbsns.lol) ([post](https://srsbsns.lol/going-to-gotosocial/), [compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/gotosocial/compose.yaml))
  - [Portainer](https://www.portainer.io/) for managing all of my container workloads.
  - [Prometheus](https://github.com/prometheus/prometheus) and [Grafana](https://github.com/grafana/grafana) for collecting metrics and creating pretty monitoring dashboards ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/promgraf/compose.yaml))
- `files`: Ubuntu 20.04 file server. Serves (selected) files semi-publicly through [Tailscale Funnel](/tailscale-ssh-serve-funnel/#tailscale-funnel)
- `hassos`: [Home Assistant OS](https://www.home-assistant.io/installation/), manages all my "smart home" stuff ([post](/automating-camera-notifications-home-assistant-ntfy/))
- `immich`: Ubuntu 22.04 [Immich](https://immich.app/) server
- `salt`: Ubuntu 20.04 [Salt](https://saltproject.io/) Master server for configuration management
- `unifi`: UniFi Network Application. Manages the Unifi switch.

**Hashicorp Nomad Cluster (WIP)**
- 3x [Zima Blade 7700](https://shop.zimaboard.com/products/zimablade-single-board-server-for-cyber-native)
  - Intel® Celeron® N3450 (4 cores @ 1.10GHz)
  - 16GB RAM
  - 1x 32GB eMMC
  - 1x 1TB SATA SSD
- [TP-Link TL-SG108E 1GbE Switch](https://www.tp-link.com/us/home-networking/8-port-switch/tl-sg108e/)

This triad of cute little single-board computers will *eventually* be a combination Nomad + Consul + Vault cluster, fully managed with Salt.

**[PiAware](https://www.flightaware.com/adsb/piaware/build) ADS-B/MLAT Receiver**
- Raspberry Pi 4 Model B
- 2x [RTL-SDR Blog V3 R860 RTL2832U 1PPM TCXO SMA Dongle](https://www.amazon.com/gp/product/B0129EBDS2)
- [SIGNALPLUS 1090MHz 12dBi 1.1m ADS-B Antenna](https://www.amazon.com/gp/product/B08XYRMG3V/)

I like to know what's flying overhead, and I'm also feeding flight data to [flightaware.com](https://flightaware.com), [ADS-B Exchange](https://www.adsbexchange.com/), [adsb.fi](https://adsb.fi), and [adsb.lol](https://adsb.lol/).

### Cloud

**[Google Cloud Platform](https://cloud.google.com/free/docs/free-cloud-features)**
- `smp`: Ubuntu 22.04 [SimpleX](/simplex/) server
- `smp1`: Ubuntu 22.04 [SimpleX](/simplex/) server

**[Vultr](https://www.vultr.com)**
- `volly`: Ubuntu 22.04 Docker host for various workloads, served either locally through [Caddy](https://caddyserver.com/) or as a cloud proxy with [Caddy + Tailscale](/caddy-tailscale-alternative-cloudflare-tunnel/):
  - [SimpleX](/simplex/) server (`smp2`)

**[Hetzner](https://www.hetzner.com/)**
- `hezzy`: Ubuntu 24.04 Docker host for various workloads, served either locally through [Caddy](https://caddyserver.com/) or as a cloud proxy with [Caddy + Tailscale](/caddy-tailscale-alternative-cloudflare-tunnel/):
  - [Bearlytics](https://github.com/hermanmartinus/bearlytics/), a lightweight and privacy-friendly web analytics platform ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/bearlytics/compose.yaml))
  - [CrowdSec Security Engine](https://github.com/crowdsecurity/crowdsec) to detect and respond to security threats
  - [Forgejo](https://forgejo.org/) server for [git.vim.wtf](https://git.vim.wtf/explore/repos)([post](/gitea-self-hosted-git-server/))
  - [GoToSocial](https://gotosocial.org/) to host my *new* personal Mastodon-compatible ActivityPub server, [vim.wtf](https://vim.wtf) ([post](https://srsbsns.lol/going-to-gotosocial/), [compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/gotosocial-vimwtf/compose.yaml))
  - [ntfy](https://ntfy.sh/) notification service ([post](/easy-push-notifications-with-ntfy/), [compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/ntfy/compose.yaml))
  - [Phanpy](https://github.com/cheeaun/phanpy) Fediverse frontend
  - [Uptime Kuma](https://github.com/louislam/uptime-kuma) for monitoring internal services (via Tailscale) ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/uptime/compose.yaml))
  - [vault-unseal](https://github.com/lrstanley/vault-unseal) to auto-unseal my on-prem Vault ([compose.yaml](https://git.vim.wtf/wq/compositions/src/branch/main/vault-unseal/compose.yaml))

