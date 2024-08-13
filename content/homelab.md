---
title: "/homelab"
date: "2024-05-26T21:30:51Z"
lastmod: "2024-08-13T02:12:54Z"
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

The Proxmox cluster hosts a number of VMs and LXC containers:
- `doc`: Ubuntu 22.04 Docker host for various on-prem container workloads, served via [Tailscale Serve](/tailscale-ssh-serve-funnel/#tailscale-serve) / [Cloudflare Tunnel](/publish-services-cloudflare-tunnel/):
  - [Calibre Web](https://github.com/janeczku/calibre-web) for managing my ebooks
  - [Crowdsec](https://www.crowdsec.net/) log processor
  - [Cyberchef](https://github.com/gchq/CyberChef), the Cyber Swiss Army Knife
  - [Hashicorp Vault](https://www.vaultproject.io/) for secrets management
  - [Miniflux](https://miniflux.app/) feed reader
  - [RIPE Atlas Probe](https://www.ripe.net/analyse/internet-measurements/ripe-atlas/) for measuring internet connectivity
  - [SilverBullet](https://silverbullet.md), a web-based personal knowledge management system
  - [Tailscale Golink](https://github.com/tailscale/golink), a private shortlink service ([post](/tailscale-golink-private-shortlinks-tailnet/))
- `files`: Ubuntu 20.04 file server. Serves (selected) files semi-publicly through [Tailscale Funnel](/tailscale-ssh-serve-funnel/#tailscale-funnel)
- `hassos`: [Home Assistant OS](https://www.home-assistant.io/installation/), manages all my "smart home" stuff ([post](/automating-camera-notifications-home-assistant-ntfy/))
- `immich`: Ubuntu 22.04 [Immich](https://immich.app/) server
- `ipam`: Ubuntu 20.04 [phpIPAM](https://phpipam.net/) server ([post](/integrating-phpipam-with-vrealize-automation-8/#step-0-phpipam-installation-and-base-configuration))
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
- Raspberry Pi 2 Model B
- 2x [RTL-SDR Blog V3 R860 RTL2832U 1PPM TCXO SMA Dongle](https://www.amazon.com/gp/product/B0129EBDS2)
- [SIGNALPLUS 1090MHz 12dBi 1.1m ADS-B Antenna](https://www.amazon.com/gp/product/B08XYRMG3V/)

I like to know what's flying overhead, and I'm also feeding flight data to [flightaware.com](https://flightaware.com) and [adsb.fi](https://adsb.fi).

### Cloud

**[Oracle Cloud Infrastructure](https://www.oracle.com/cloud/free/)**
- `git`: Ubuntu 22.04 [Forgejo](https://forgejo.org/) server for [git.bowdre.net](https://git.bowdre.net/explore/repos)
- `smp2`: Ubuntu 22.04 [SimpleX](/simplex/) server

**[Google Cloud Platform](https://cloud.google.com/free/docs/free-cloud-features)**
- `smp`: Ubuntu 22.04 [SimpleX](/simplex/) server
- `smp1`: Ubuntu 22.04 [SimpleX](/simplex/) server

**[Vultr](https://www.vultr.com)**
- `volly`: Ubuntu 22.04 Docker host for various workloads, served either through [Caddy](https://caddyserver.com/) or [Cloudflare Tunnel](/publish-services-cloudflare-tunnel/):
  - [Agate](https://github.com/mbrubeck/agate) Gemini server ([post](/gemini-capsule-gempost-github-actions/))
  - [Crowdsec](https://www.crowdsec.net) security engine
  - [Kineto](https://github.com/beelux/kineto) Gemini-to-HTTP proxy ([post](/gemini-capsule-gempost-github-actions/))
  - [Linkding](https://github.com/sissbruecker/linkding) bookmark manager serving [links.bowdre.net](https://links.bowdre.net/bookmarks/shared)
  - [ntfy](https://ntfy.sh/) notification service ([post](/easy-push-notifications-with-ntfy/))
  - [SearXNG](https://docs.searxng.org/) self-hosted metasearch engine serving [grep.vpota.to](https://grep.vpota.to) ([post](https://srsbsns.lol/post/self-hosting-a-search-engine-iyjdlk6y))
  - [Uptime Kuma](https://github.com/louislam/uptime-kuma) for monitoring internal services (via Tailscale)
  - [vault-unseal](https://github.com/lrstanley/vault-unseal) to auto-unseal my on-prem Vault instance
