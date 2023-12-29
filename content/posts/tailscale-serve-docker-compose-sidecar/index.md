---
title: "Tailscale Serve in a Docker Compose Sidecar"
date: 2023-12-28
# lastmod: 2023-12-28
draft: true
description: "This is a new post about..."
featured: false
toc: true
comment: true
series: Tips # Projects, Code
tags:
  - containers
  - docker
  - selfhosting
  - tailscale
---
Hi, and welcome back to what has become my [Tailscale blog](/tags/tailscale/).

I have a few servers that I use for running multiple container workloads. My approach in the past had been to use [Caddy webserver](https://caddyserver.com/) on the host to proxy the various containers. With this setup, each app would have its own DNS record, and Caddy would be configured to route traffic to the appropriate internal port based on that. For instance:

```text
# torchlight! {"lineNumbers": true}
cyberchef.runtimeterror.dev {
  reverse_proxy localhost:8000
}

ntfy.runtimeterror.dev, http://ntfy.runtimeterror.dev {
  reverse_proxy localhost:8080
  @httpget {
    protocol http
    method GET
    path_regexp ^/([-_a-z0-9]{0,64}$|docs/|static/)
  }
  redir @httpget https://{host}{uri}
}

uptime.runtimeterror.dev, status.vpota.to {
  reverse_proxy localhost:3001
}

miniflux.runtimeterror.dev {
  reverse_proxy localhost:8080
}
```

*and so on...* You get the idea. This approach works well for services I want/need to be public, but it does require me to manage those DNS records and keep track of which app is on which port. That can be kind of tedious.

And I don't really need all of these services to be public. Not because they're particularly sensitive, but I just don't really have a reason to share my personal [Miniflux](https://github.com/miniflux/v2) or [CyberChef](https://github.com/gchq/CyberChef) instance with the world at large. Those would be great candidates to serve with [Tailscale Serve](/tailscale-ssh-serve-funnel#tailscale-serve) so they'd only be available on my tailnet. Of course, with that setup I'd have to differentiate the services based on external port numbers since they'd all be served with the same hostname. That's not ideal either.

```shell
sudo tailscale serve --bg --https 8443 8180 # [tl! .cmd]
Available within your tailnet: # [tl! .nocopy:6]

https://tsdemo.tailnet-name.ts.net/
|-- proxy http://127.0.0.1:8000

https://tsdemo.tailnet-name.ts.net:8443/
|-- proxy http://127.0.0.1:8080
```

It would be really great if I could directly attach each container to my tailnet and then access the apps with addresses like `https://miniflux.tailnet-name.ts.net` or `https://cyberchef.tailnet-name.ts.net`. Tailscale does provide an [official Tailscale image](https://hub.docker.com/r/tailscale/tailscale) which seems like it should make this a really easy problem to address. It runs in userspace by default (neat!), and [even seems to accept a `TS_SERVE_CONFIG` parameter](https://github.com/tailscale/tailscale/blob/5812093d31c8a7f9c5e3a455f0fd20dcc011d8cd/cmd/containerboot/main.go#L43) to configure Tailscale Serve... unfortunately, I haven't been able to find any documentation about how to create the required `ipn.ServeConfig` file to be able to use of that. I also struggled to find guidance on how to actually connect a Tailscale sidecar to an app container in the first place.

And then I came across [Louis-Philippe Asselin's post](https://asselin.engineer/tailscale-docker) about how he set up Tailscale in Docker Compose. When he wrote his post, there was even less documentation on how to do this stuff, so he used a [modified Tailscale docker image](https://github.com/lpasselin/tailscale-docker) with a [startup script](https://github.com/lpasselin/tailscale-docker/blob/c6f8d75b5e1235b8dbeee849df9321f515c526e5/images/tailscale/start.sh) to handle some of the configuration steps. His repo also includes a [helpful docker-compose example](https://github.com/lpasselin/tailscale-docker/blob/c6f8d75b5e1235b8dbeee849df9321f515c526e5/docker-compose/stateful-example/docker-compose.yml) of how to connect it together.

I quickly realized I could probably modified his startup script to take care of my Tailscale Serve need. So here's how I did it.

### Docker Image
My image will start out the same as Louis-Philippe's, with just adding a startup script to the official Tailscale image:

```Dockerfile
# torchlight! {"lineNumbers": true}
FROM tailscale/tailscale:v1.56.1
COPY start.sh /usr/bin/start.sh
RUN chmod +x /usr/bin/start.sh
CMD "start.sh"
```

The `start.sh` script has a few tweaks for brevity/clarity, and also adds a block for conditionally enabling a basic Tailscale Serve configuration:
```shell
#!/bin/ash
# torchlight! {"lineNumbers": true}
trap 'kill -TERM $PID' TERM INT
echo "Starting Tailscale daemon"
tailscaled --tun=userspace-networking --state=${TS_STATE} ${TS_OPT} &
PID=$!
until tailscale up --authkey="${TS_AUTHKEY}" --hostname="${TS_HOSTNAME}"; do
  sleep 0.1
done
tailscale status
if [ -n "${TS_SERVE_PORT}" ]; then # [tl! ++:4]
  if ! tailscale serve status | grep -q "${TS_SERVE_PORT}"; then
    tailscale serve --bg "${TS_SERVE_PORT}"
  fi
fi
wait ${PID}
```


```yaml
services:
  tailscale:
    build:
      context: ./image/
    container_name: tailscale
    environment:
      TS_AUTH_KEY: ${TS_AUTH_KEY:?err} # from https://login.tailscale.com/admin/settings/authkeys
      TS_HOSTNAME: ${TS_HOSTNAME:-ts-docker}
      TS_STATE_ARG: "/var/lib/tailscale/tailscale.state" # store ts state in a local volume
      TS_SERVE_PORT: ${TS_SERVE_PORT:-} # optional port to proxy with tailscale serve (ex: '80')
    volumes:
      - ./ts_data:/var/lib/tailscale/
  cyberchef:
    container_name: cyberchef
    image: mpepping/cyberchef:latest
    restart: unless-stopped
    network_mode: service:tailscale
```

```shell
DB_USER=my_db_user
DB_PASS=my_db_password
ADMIN_USER=my_admin_user
ADMIN_PASS=my_admin_password
TS_AUTH_KEY=tskey-auth-my_auth_key
TS_HOSTNAME=miniflux
TS_SERVE_PORT=8080
```

```yaml
services:
  tailscale:
    image: ghcr.io/jbowdre/tailscale-docker:latest
    container_name: miniflux-tailscaled
    environment:
      TS_AUTH_KEY: ${TS_AUTH_KEY:?err} # from https://login.tailscale.com/admin/settings/authkeys
      TS_HOSTNAME: ${TS_HOSTNAME:-ts-docker}
      TS_STATE_ARG: "/var/lib/tailscale/tailscale.state" # store ts state in a local volume
      TS_SERVE_PORT: ${TS_SERVE_PORT:-} # optional port to proxy with tailscale serve (ex: '80')
    volumes:
      - ./ts_data:/var/lib/tailscale/
  miniflux:
    image: miniflux/miniflux:latest
    container_name: miniflux
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@db/miniflux?sslmode=disable
      - RUN_MIGRATIONS=1
      - CREATE_ADMIN=1
      - ADMIN_USERNAME=${ADMIN_USER}
      - ADMIN_PASSWORD=${ADMIN_PASS}
    network_mode: "service:tailscale"
  db:
    image: postgres:15
    container_name: miniflux-db
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASS}
    volumes:
      - ./mf_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "${DB_USER}"]
      interval: 10s
      start_period: 30s
```