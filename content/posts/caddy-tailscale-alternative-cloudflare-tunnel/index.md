---
title: "Caddy + Tailscale as an Alternative to Cloudflare Tunnel"
date: 2024-09-22
# lastmod: 2024-09-22
draft: true
description: "This is a new post about..."
featured: false
toc: true
reply: true
categories: Self-Hosting
tags:
  - caddy
  - cloud
  - containers
  - docker
  - networking
  - selfhosting
  - tailscale
---
Earlier this year, I [shared how I used Cloudflare Tunnel](/publish-services-cloudflare-tunnel/) to publish some self-hosted resources on the internet without needing to expose any part of my home network. Since then, I've [moved many resources to bunny.net](https://srsbsns.lol/i-just-hopped-to-bunnynet/) ([including this website](/further-down-the-bunny-hole/)). I left some domains at Cloudflare, primarily just to benefit from the convenience of Cloudflare Tunnel, but I wasn't thrilled about being so dependent upon a single company that controls so much of the internet.

However a [post on Tailscale's blog this week](https://tailscale.com/blog/last-reverse-proxy-you-need) reminded me that there was another easy approach using solutions I'm already using heavily: [Caddy](/tags/caddy) and [Tailscale](/tags/tailscale). Caddy is a modern web server (that works great as a reverse proxy with automatic HTTPS), and Tailscale [makes secure networking simple](/secure-networking-made-simple-with-tailscale/). Combining the two allows me to securely serve web services without any messy firewall configurations.

So here's how I ditched Cloudflare Tunnel in favor of Caddy + Tailscale.

### Docker Compose config
To keep things simple, I'll deploy the [same speedtest app I used to demo Cloudflare Tunnel](https://runtimeterror.dev/publish-services-cloudflare-tunnel/#speedtest-demo) on a Docker host located in my [homelab](/homelab).

Here's a basic config to run [openspeedtest](https://github.com/openspeedtest/Docker-Image) on HTTP only (defaults to port `3000`):

```yaml
# torchlight! {"lineNumbers":true}
services:
  speedtest:
    image: openspeedtest/latest
    container_name: speedtest
    restart: unless-stopped
    ports:
      - 3000:3000
```

### A Tailscale sidecar
I can easily add [Tailscale in a sidecar container](/tailscale-serve-docker-compose-sidecar/) to make my new speedtest available within my tailnet:

```yaml
# torchlight! {"lineNumbers":true}
services:
  speedtest:
    image: openspeedtest/latest
    container_name: speedtest
    restart: unless-stopped
    ports: # [tl! --:1]
      - 3000:3000
    network_mode: service:tailscale # [tl! ++]

  tailscale: # [tl! ++:12]
    image: tailscale/tailscale:latest
    container_name: speedtest-tailscale
    restart: unless-stopped
    environment:
      TS_AUTHKEY: ${TS_AUTHKEY:?err}
      TS_HOSTNAME: ${TS_HOSTNAME:-ts-docker}
      TS_STATE_DIR: /var/lib/tailscale/
    volumes:
      - ./ts_data:/var/lib/tailscale/
```

Note that I no longer need to ask the host to expose port `3000` from the container; instead, I bridge the `speedtest` container's network with that of the `tailscale` container.

And I create a simple `.env` file with the secrets required for connecting to Tailscale using a [pre-authentication key](https://tailscale.com/kb/1085/auth-keys):

```shell
# torchlight! {"lineNumbers":true}
TS_AUTHKEY=tskey-auth-somestring-somelongerstring
TS_HOSTNAME=speedtest
```

After a quick `docker compose up -d` I can access my new speedtest at `http://speedtest.tailnet-name.ts.net:3000`. Next I just need to put it behind Caddy.

### Caddy configuration
I already have [Caddy](https://caddyserver.com/) running on a server in [Vultr](https://www.vultr.com/) ([referral link](https://www.vultr.com/?ref=9488431)) so I'll be using that to front my new speedtest server. I add a DNS record in Bunny for `speed.runtimeterror.dev` pointed to the server's public IP address, and then add a corresponding block to my `/etc/caddy/Caddyfile` configuration:


```text
speed.runtimeterror.dev {
        bind 192.0.2.1    # replace with server's public interface address
        reverse_proxy http://speedtest.tailnet-name.ts.net:3000
}
```

{{% notice note "Caddy binding" %}}
Since I'm already using Tailscale Serve for other services on this server, I use the `bind` directive to explicitly tell Caddy to listen on the server's public IP address. By default, it will try to listen on *all* interfaces and that would conflict with `tailscaled` that's already bound to the tailnet-internal IP.
{{% /notice %}}

The `reverse_proxy` directive points to speedtest's HTTP endpoint within my tailnet; all traffic between tailnet addresses is already encrypted, and I can just let Caddy obtain and serve the SSL certificate automagically.

Now I just need to reload the Caddyfile:

```shell
sudo caddy reload -c /etc/caddy/Caddyfile # [tl! .cmd]
  INFO    using config from file  {"file": "/etc/caddy/Caddyfile"} # [tl! .nocopy:1]
  INFO    adapted config to JSON  {"adapter": "caddyfile"}
```

And I can try out my speedtest at `https://speed.runtimeterror.dev`:

![OpenSpeedTest results showing a download speed of 194.1 Mbps, upload speed of 147.8 Mbps, and ping of 20 ms with 0.6 ms jitter. A graph displays connection speed over time.](speedtest.png)

*Not bad!*

### Conclusion
Combining the powers (and magic) of Caddy and Tailscale makes it easy to publicly serve content from private resources without compromising on security *or* extending vendor lock-in. This will dramatically simplify migrating the rest of my domains from Cloudflare to Bunny.
