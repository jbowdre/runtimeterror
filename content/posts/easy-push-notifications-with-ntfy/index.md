---
title: "Easy Push Notifications With ntfy.sh"
date: 2023-09-11
# lastmod: 2023-09-11
draft: true
description: "Deploying and configuring a self-hosted pub-sub notification handler, getting another server to send a notifcation when it boots, and integrating the notification handler in Home Assistant."
featured: false
toc: true
comment: true
series: Projects
tags:
  - android
  - api
  - automation
  - containers
  - docker
  - homeassistant
  - linux
  - rest
  - selfhosting
  - shell
---

Wouldn't it be great if there was a simple way to send a notification to your phone(s) with a simple `curl` call? Then you could get notified when a script completes, or a server reboots, a user logs in to a system, or a sensor connected to Home Assistant changes state. How great would that be??

[ntfy.sh](https://ntfy.sh) (pronounced *notify*) provides just that. It's an [open-source](https://github.com/binwiederhier/ntfy), easy-to-use, HTTP-based [pub-sub](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern) notification service, and it can notify using either mobile apps for Android ([Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [F-Droid](https://f-droid.org/en/packages/io.heckel.ntfy/)) or iOS ([App Store](https://apps.apple.com/us/app/ntfy/id1625396347)) or a [web app](https://ntfy.sh/app). I thought it sounded pretty compelling - and *then* I notice that [ntfy's docs](https://docs.ntfy.sh/install/) made it sound really easy to self-host the server component.

So let's take it for a spin!

## Installation
I'm going to use the [Docker setup](https://docs.ntfy.sh/install/#docker) on an existing cloud server and use [Caddy](https://caddyserver.com/) as a reverse proxy.[^caddy]

So I'll start by creating a new directory at `/opt/ntfy/` to hold the goods, and create a compose config.
`/opt/ntfy/docker-compose.yml`:
```yaml
version: "2.3"

services:
  ntfy:
    image: binwiederhier/ntfy
    container_name: ntfy
    command:
      - serve
    environment:
      - TZ=UTC    # optional: set desired timezone
    volumes:
      - ./cache/ntfy:/var/cache/ntfy
      - ./etc/ntfy:/etc/ntfy
      - ./lib/ntf:/var/lib/ntfy
    ports:
      - 8080:80
    healthcheck: # optional: remember to adapt the host:port to your environment
        test: ["CMD-SHELL", "wget -q --tries=1 http://localhost:8080/v1/health -O - | grep -Eo '\"healthy\"\\s*:\\s*true' || exit 1"]
        interval: 60s
        timeout: 10s
        retries: 3
        start_period: 40s
    restart: unless-stopped
```

This config will create/mount folders in the working directory to store the ntfy cache and config


I can go ahead and bring it up:
```shell
sudo docker-compose up -d
```

I'll also want to add the following to my Caddy config:
`/etc/caddy/Caddyfile`:
```
ntfy.example.com, http://ntfy.example.com {
  reverse_proxy localhost:8080
  @httpget {
    protocol http
    method GET
    path_regexp ^/([-_a-z0-9]{0,64}$|docs/|static/)
  }
  redir @httpget https://{host}{uri}
}
```

And I'll restart Caddy to apply the config:
```shell
sudo systemctl restart caddy
```

[^caddy]: I'm a big fan of Caddy. It may not be quite as capable/flexible as `nginx` but I love how simple it makes most configurations. Using Caddy in this will will not only enable HTTPS for the new web service but will also automatically obtain/renew LetsEncrypt certs so that I don't even have to think about it.

## Configuration
`/opt/ntfy/etc/ntfy/server.yml`:
```yaml
auth-file: "/var/lib/ntfy/user.db"
auth-default-access: "deny-all"
base-url: "https://ntfy.example.com"
```

```shell
sudo docker-compose down && sudo docker-compose up -d
sudo docker exec -it ntfy /bin/sh
ntfy user add --role=admin admin_user
ntfy user add writer
ntfy token add writer
ntfy access writer ping write-only
```

## Usage

```shell
curl \
  -u "writer:$password" \
  -d "My first notification" \
  https://ntfy.example.com/ping

curl \
  -H "Authorization: Bearer $token" \
  -H "Title: Here's a Message Title" \
  -d "This is the message body" \
  https://ntfy.example.com/ping
```

### Notify on boot

`/usr/local/bin/ntfy_push.sh`:
```shell
#!/usr/bin/env bash

curl \
  -H "Authorization: Bearer $TOKEN" \
  -H "Title: $1" \
  -d "$2" \
  https://ntfy.example.com/ping
```

`/usr/local/bin/ntfy_boot_complete.sh`:
```shell
#!/usr/bin/env bash

TITLE="$(hostname -s)"
MESSAGE="System boot complete"

/usr/local/bin/ntfy_push.sh "$TITLE" "$MESSAGE"
```

`/etc/systemd/system/ntfy_boot_complete.service`:
```
[Unit]
After=network.target

[Service]
ExecStart=/usr/local/bin/ntfy_boot_complete.sh

[Install]
WantedBy=default.target
```

```shell
sudo systemctl daemon-reload
sudo systemctl enable --now ntfy_boot_complete.service
```

### Home Assistant
`configuration.yaml`:
```yaml
notify:
  - name: ntfy
    platform: rest
    method: POST_JSON
    authentication: basic
    username: writer
    password: $PASSWORD
    data:
      topic: ping
    title_param_name: title
    message_param_name: message
    resource: https://ntfy.example.com
```

`automations.yaml`:
```yaml
- alias: Water Leak Detection
  description: ''
  trigger:
  - platform: state
    entity_id:
    - binary_sensor.water_6
    - binary_sensor.water_3
    - binary_sensor.water_5
    from: 'off'
    to: 'on'
  condition: []
  action:
  - service: notify.ntfy
    data:
      title: Leak detected!
      message: '{{ trigger.to_state.attributes.friendly_name }} detected.'
```