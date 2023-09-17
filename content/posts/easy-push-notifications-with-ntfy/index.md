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

### The Pitch

Wouldn't it be great if there was a simple way to send a notification to your phone(s) with a simple `curl` call? Then you could get notified when a script completes, or a server reboots, a user logs in to a system, or a sensor connected to Home Assistant changes state. How great would that be??

[ntfy.sh](https://ntfy.sh) (pronounced *notify*) provides just that. It's an [open-source](https://github.com/binwiederhier/ntfy), easy-to-use, HTTP-based notification service, and it can notify using mobile apps for Android ([Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [F-Droid](https://f-droid.org/en/packages/io.heckel.ntfy/)) or iOS ([App Store](https://apps.apple.com/us/app/ntfy/id1625396347)) or a [web app](https://ntfy.sh/app).


I thought it sounded pretty compelling - and *then* I noticed that [ntfy's docs](https://docs.ntfy.sh/install/) made it sound really easy to self-host the server component, which would give me a bit more control and peace of mind.

{{% notice tip "Topics are public" %}}
Ntfy leverages uses a [pub-sub](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern) approach, and (by default) all topics are public. This means that anyone can write to or read from any topic, which makes it important to use a topic name that others aren't likely to guess.

Self-hosting lets you [define ACLs](https://docs.ntfy.sh/config/#access-control) to protect sensitive topics.
{{% /notice %}}

So let's take it for a spin!

### The Setup
I'm going to use the [Docker setup](https://docs.ntfy.sh/install/#docker) on an existing cloud server and use [Caddy](https://caddyserver.com/) as a reverse proxy.[^caddy] I'll also configure ntfy to require authentication so that randos (hi!) won't be able to harass me with notifications.

[^caddy]: I'm a big fan of Caddy. It may not be quite as capable/flexible as `nginx` but I love how simple it makes most configurations. Using Caddy in this will will not only enable HTTPS for the new web service but will also automatically obtain/renew LetsEncrypt certs so that I don't even have to think about it.

#### Ntfy in Docker
So I'll start by creating a new directory at `/opt/ntfy/` to hold the goods, and create a compose config.

```shell
$ sudo mkdir -p /opt/ntfy
$ sudo vim /opt/ntfy/docker-compose.yml
```

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
      - 2586:80
    healthcheck: # optional: remember to adapt the host:port to your environment
        test: ["CMD-SHELL", "wget -q --tries=1 http://localhost:8080/v1/health -O - | grep -Eo '\"healthy\"\\s*:\\s*true' || exit 1"]
        interval: 60s
        timeout: 10s
        retries: 3
        start_period: 40s
    restart: unless-stopped
```

This config will create/mount folders in the working directory to store the ntfy cache and config. It also maps `localhost:2586` to port `80` on the container, and enables a simple healthcheck against the ntfy health API endpoint. This will ensure that the service stays healthy.


I can go ahead and bring it up:
```shell
$ sudo docker-compose up -d
Creating network "ntfy_default" with the default driver
Pulling ntfy (binwiederhier/ntfy:)...
latest: Pulling from binwiederhier/ntfy
7264a8db6415: Pull complete
1ac6a3b2d03b: Pull complete
Digest: sha256:da08556da89a3f7317557fd39cf302c6e4691b4f8ce3a68aa7be86c4141e11c8
Status: Downloaded newer image for binwiederhier/ntfy:latest
Creating ntfy ... done
```

#### Caddy Reverse Proxy
I'll also want to add [the following](https://docs.ntfy.sh/config/#nginxapache2caddy) to my Caddy config:
`/etc/caddy/Caddyfile`:
```
ntfy.runtimeterror.dev, http://ntfy.runtimeterror.dev {
  reverse_proxy localhost:2586

  # Redirect HTTP to HTTPS, but only for GET topic addresses, since we want
  # it to work with curl without the annoying https:// prefix
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
$ sudo systemctl restart caddy
```

Now I can point my browser to `https://ntfy.runtimeterror.dev` and see the web interface:

![Ntfy web interface](web_ui.png)

I can subscribe to a new topic:
![Subscribing to a public topic](subscribe_public_topic.png)

And publish a message to it:
```shell
$ curl -d "Hi" https://ntfy.runtimeterror.dev/testy
{"id":"80bUl6cKwgBP","time":1694981305,"expires":1695024505,"event":"message","topic":"testy","message":"Hi"}
```

Which will then show up as a notification in my browser:
![Browser notification](browser_notification.png)


#### Post-deploy Configuration
So now I've got my own ntfy server, and I've verified that it works for unauthenticated notifications. I don't really want to operate *anything* on the internet without requiring authentication, though, so I'm going to configure ntfy to prevent unauthenticated reads and writes.

I'll start by creating a `server.yml` config file which will be mounted into the container. This config will specify where to store the user database and switch the default ACL to `deny-all`:
`/opt/ntfy/etc/ntfy/server.yml`:
```yaml
auth-file: "/var/lib/ntfy/user.db"
auth-default-access: "deny-all"
base-url: "https://ntfy.runtimeterror.dev"
```

I can then restart the container, and try again to subscribe to the same (or any other topic):
```shell
$ sudo docker-compose down && sudo docker-compose up -d

```

Now I get prompted to log in:
![Login prompt](login_required.png)

I'll need to use the ntfy CLI to create/manage entries in the user DB, and that means first grabbing a shell inside the container:
```shell
$ sudo docker exec -it ntfy /bin/sh
```

For now, I'm going to create three users: one as an administrator, one as a "writer", and one as a "reader". I'll be prompted for a password for each:
```shell
$ ntfy user add --role=admin administrator
user administrator added with role admin
$ ntfy user add writer
user writer added with role user
$ ntfy user add reader
user reader added with role user
```

The admin user has global read+write access, but right now the other two can't do anything. Let's make it so that `writer` can write to all topics, and `reader` can read from all topics:
```shell
$ ntfy access writer '*' write
$ ntfy access reader '*' read
```

I could lock these down further by selecting specific topic names instead of `'*'` but this will do fine for now.

Let's go ahead and verify the access as well:
```shell
$ ntfy access
user administrator (role: admin, tier: none)
- read-write access to all topics (admin role)
user reader (role: user, tier: none)
- read-only access to topic *
user writer (role: user, tier: none)
- write-only access to topic *
user * (role: anonymous, tier: none)
- no topic-specific permissions
- no access to any (other) topics (server config)
```

While I'm at it, I also want to configure an access token to be used with the `writer` account. I'll be able to use that instead of username+password when publishing messages.
```shell
$ ntfy token add writer
token tk_mm8o6cwxmox11wrnh8miehtivxk7m created for user writer, never expires
```

I can go back to the web, subscribe to the `testy` topic again using the `reader` credentials, and then test sending an authenticated notification with `curl`:
```shell
$ curl -H "Authorization: Bearer tk_mm8o6cwxmox11wrnh8miehtivxk7m" \
  -d "Once more, with auth!" \
  https://ntfy.runtimeterror.dev/testy
{"id":"0dmX9emtehHe","time":1694987274,"expires":1695030474,"event":"message","topic":"testy","message":"Once more, with auth!"}
```

![Authenticated notification](authenticated_notification.png)


### Use Cases
Pushing notifications from the command line is neat, but how can I use this to actually make my life easier? Let's knock out quick quick configurations for a couple of the use cases I pitched at the top of the post: alerting me when a server has booted, and handling Home Assistant notifications in a better way.

#### Notify on Boot
I'm sure there are a bunch of ways to get a Linux system to send a simple `curl` call on boot. I'm going to create a simple script that will be triggered by a systemd service definition.

##### Generic Push Script
I may want to wind up having servers notify for a variety of conditions so I'll start with a generic script which will accept a notification title and message as arguments:

`/usr/local/bin/ntfy_push.sh`:
```shell
#!/usr/bin/env bash

curl \
  -H "Authorization: Bearer tk_mm8o6cwxmox11wrnh8miehtivxk7m" \
  -H "Title: $1" \
  -d "$2" \
  https://ntfy.runtimeterror.dev/server_alerts
```

Note that I'm using a new topic name now: `server_alerts`. Topics are automatically created when messages are posted to them. I just need to make sure to subscribe to the topic in the web UI (or mobile app) so that I can receive these notifications.

Okay, now let's make it executable and then give it a quick test:
```shell
$ chmod +x /usr/local/bin/ntfy_push.sh
$ /usr/local/bin/ntfy_push.sh "Script Test" "This is a test from the magic script I just wrote."
```

![Script test](script_test.png)

#### Wrapper for Specific Message
I don't know an easy way to tell a systemd service definition to pass arguments to a command, so I'll use a quick wrapper script to pass in the notification details:

`/usr/local/bin/ntfy_boot_complete.sh`:
```shell
#!/usr/bin/env bash

TITLE="$(hostname -s)"
MESSAGE="System boot complete"

/usr/local/bin/ntfy_push.sh "$TITLE" "$MESSAGE"
```

And this one should be executable as well:
```shell
$ chmod +x /usr/local/bin/ntfy_boot_complete.sh
```
#### Service Definition
Finally I can create and register the service definition so that the script will run at each system boot.

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

And I can test it by rebooting my server. I should get a push notification shortly...

![Boot notification](boot_notification.png)

Nice! Now I won't have to continually ping a server to see if it's finished rebooting yet.

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