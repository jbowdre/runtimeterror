---
title: "SilverBullet: Self-Hosted Knowledge Management Web App"
date: "2024-08-22T02:56:12Z"
# lastmod: 2024-08-12
description: "Deploying SilverBullet with Docker Compose, and accessing it from anywhere with Tailscale and Cloudflare Tunnel."
featured: false
toc: true
reply: true
categories: Self-Hosting
tags:
  - cloudflare
  - containers
  - docker
  - linux
  - selfhosting
  - tailscale
---

I [recently posted on my other blog](https://srsbsns.lol/is-silverbullet-the-note-keeping-silver-bullet/) about trying out [SilverBullet](https://silverbullet.md), an open-source self-hosted web-based note-keeping app. SilverBullet has continued to impress me as I use it and learn more about its [features](https://silverbullet.md/SilverBullet@1992). It really fits my multi-device use case much better than Obsidian ever did (even with its paid sync plugin).

In that post, I shared a brief overview of how I set up SilverBullet:

> I deployed my instance in Docker alongside both a [Tailscale sidecar](/tailscale-serve-docker-compose-sidecar/) and [Cloudflare Tunnel sidecar](/publish-services-cloudflare-tunnel/). This setup lets me easily access/edit/manage my notes from any device I own by just pointing a browser at `https://silverbullet.tailnet-name.ts.net/`. And I can also hit it from any *other* device by using the public Cloudflare endpoint which is further protected by an email-based TOTP challenge. Either way, I don't have to worry about installing a bloated app or managing a complicated sync setup. Just log in and write.

This post will go into a bit more detail about that configuration.

### Preparation
I chose to deploy SilverBullet on an Ubuntu 22.04 VM in my [homelab](/homelab/) which was already set up for serving Docker workloads so I'm not going to cover the Docker [installation process](https://docs.docker.com/engine/install/ubuntu/) here. I tend to run my Docker workloads out of `/opt/` so I start this journey by creating a place to hold the SilverBullet setup:

```shell
sudo mkdir -p /opt/silverbullet # [tl! .cmd]
```

I set appropriate ownership of the folder and then move into it:

```shell
sudo chown john:docker /opt/silverbullet # [tl! .cmd:1]
cd /opt/silverbullet
```

### SilverBullet Setup
The documentation offers easy-to-follow guidance on [installing SilverBullet with Docker Compose](https://silverbullet.md/Install/Docker), and that makes for a pretty good starting point. The only change I make here is setting the `SB_USER` variable from an environment variable instead of directly in the YAML:

```yaml
# torchlight! {"lineNumbers":true}
# docker-compose.yml
services:
  silverbullet:
    image: zefhemel/silverbullet
    container_name: silverbullet
    restart: unless-stopped
    environment:
      SB_USER: "${SB_CREDS}"
    volumes:
      - ./space:/space
    ports:
      - 3000:3000

  watchtower:
    image: containrrr/watchtower
    container_name: silverbullet-watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

I used a password manager to generate a random password *and username*, and I stored those in a `.env` file alongside the Docker Compose configuration; I'll need those credentials to log in to each SilverBullet session. For example:

```shell
# .env
SB_CREDS='alldiaryriver:XCTpmddGc3Ga4DkUr7DnPBYzt1b'
```

That's all that's needed for running SilverBullet locally, and I *could* go ahead and `docker compose up -d` to get it running. But I really want to be able to access my notes from other systems too, so let's move on to enabling remote access right away.

### Remote Access
#### Tailscale
It's no secret that I'm a [big fan of Tailscale](/secure-networking-made-simple-with-tailscale/) so I use Tailscale Serve to enable secure remote access through my tailnet. I just need to add in a [Tailscale sidecar](/tailscale-serve-docker-compose-sidecar/#compose-configuration) and update the `silverbullet` service to share Tailscale's network:

```yaml
# torchlight! {"lineNumbers":true}
# docker-compose.yml
services:
  tailscale: # [tl! ++:12 **:12]
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

  silverbullet:
    image: zefhemel/silverbullet
    container_name: silverbullet
    restart: unless-stopped
    environment:
      SB_USER: "${SB_CREDS}"
    volumes:
      - ./space:/space
    ports: # [tl! --:1 **:1]
      - 3000:3000
    network_mode: service:tailscale # [tl! ++ **]

  watchtower: # [tl! collapse:4]
    image: containrrr/watchtower
    container_name: silverbullet-watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

That of course means adding a few more items to the `.env` file:
- a [pre-authentication key](https://tailscale.com/kb/1085/auth-keys),
- the hostname to use for the application's presence on my tailnet,
- and the `--ssh` extra argument to enable SSH access to the container (not strictly necessary, but can be handy for troubleshooting).

```shell
# .env
SB_CREDS='alldiaryriver:XCTpmddGc3Ga4DkUr7DnPBYzt1b'
TS_AUTHKEY=tskey-auth-[...] # [tl! ++:2 **:2]
TS_HOSTNAME=silverbullet
TS_EXTRA_ARGS=--ssh
```

And I need to create a `serve-config.json` file to configure [Tailscale Serve](/tailscale-ssh-serve-funnel/#tailscale-serve) to proxy port `443` on the tailnet to port `3000` on the container:

```json
// torchlight! {"lineNumbers":true}
// serve-config.json
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "silverbullet.tailnet-name.ts.net:443": {
      "Handlers": {
        "/": {
          "Proxy": "http://127.0.0.1:3000"
        }
      }
    }
  }
}
```

#### Cloudflare Tunnel
But what if I want to consult my notes from *outside* of my tailnet? Sure, I *could* use [Tailscale Funnel](/tailscale-ssh-serve-funnel/#tailscale-funnel) to publish the SilverBullet service on the internet, but (1) funnel would require me to use a URL like `https://silverbullet.tailnet-name.ts.net` instead of simply `https://silverbullet.example.com` and (2) I've seen enough traffic logs to not want to expose a login page directly to the public internet if I can avoid it.

[Cloudflare Tunnel](/publish-services-cloudflare-tunnel/) is able to address those concerns without a lot of extra work. I can set up a tunnel at `silverbullet.example.com` and use [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/) to put an additional challenge in front of the login page.

I just have to add a `cloudflared` container to my stack:

```yaml
# torchlight! {"lineNumbers":true}
# docker-compose.yml
services:
  tailscale: # [tl! collapse:12]
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

  cloudflared: # [tl! ++:9 **:9]
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

  watchtower: # [tl! collapse:4]
    image: containrrr/watchtower
    container_name: silverbullet-watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

To get the required `$CLOUDFLARED_TOKEN`, I [create a new `cloudflared` tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/) in the Cloudflare dashboard and add the generated token value to my `.env` file:

```shell
# .env
SB_CREDS='alldiaryriver:XCTpmddGc3Ga4DkUr7DnPBYzt1b'
TS_AUTHKEY=tskey-auth-[...]
TS_HOSTNAME=silverbullet
TS_EXTRA_ARGS=--ssh
CLOUDFLARED_TOKEN=eyJhIjo[...]BNSJ9 # [tl! ++ **]
```

Back in the Cloudflare Tunnel setup flow, I select my desired public hostname (`silverbullet.example.com`) and then specify that the backend service is `http://localhost:3000`.

Now I'm finally ready to start up my containers:

```shell
docker compose up -d # [tl! .cmd .nocopy:1,5]
[+] Running 5/5
 ✔ Network silverbullet_default        Created
 ✔ Container silverbullet-watchtower   Started
 ✔ Container silverbullet-tailscale    Started
 ✔ Container silverbullet              Started
 ✔ Container silverbullet-cloudflared  Started
```

#### Cloudflare Access
The finishing touch will be configuring a bit of extra protection in front of the public-facing login page, and Cloudflare Access makes that very easy. I'll just use the wizard to [add a new web application](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/) through the Cloudflare Zero Trust dashboard.

The first part of that workflow asks "What type of application do you want to add?". I select **Self-hosted**.

The next part asks for a name (**SilverBullet**), Session Duration (**24 hours**), and domain (`silverbullet.example.com`). I leave the defaults for the rest of the Configuration Application step and move on to the next one.

I'm then asked to Add Policies, and I have to start by giving a name for my policy. I opt to name it **Email OTP** because I'm going to set up email-based one-time passcodes. In the Configure Rules section, I choose **Emails** as the selector and enter my own email address as the single valid value.

And then I just click through the rest of the defaults.

### Recap
So now I have SilverBullet running in Docker Compose on a server in my homelab. I can access it from any device on my tailnet at `https://silverbullet.tailnet-name.ts.net` (thanks to the magic of Tailscale Serve). I can also get to it from outside my tailnet at `https://silverbullet.example.com` (thanks to Cloudflare Tunnel), and but I'll use a one-time passcode sent to my approved email address before also authenticating through the SilverBullet login page (thanks to Cloudflare Access).

I think it's a pretty sweet setup that gives me full control and ownership of my notes and lets me read/write my notes from multiple devices without having to worry about synchronization.