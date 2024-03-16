---
title: "Tailscale Serve in a Docker Compose Sidecar"
date: 2023-12-30
lastmod: 2024-02-07
description: "Using Docker Compose to deploy containerized applications and make them available via Tailscale Serve and Tailscale Funnel"
featured: false
toc: true
comments: true
categories: Self-Hosting
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

uptime.runtimeterror.dev {
  reverse_proxy localhost:3001
}

miniflux.runtimeterror.dev {
  reverse_proxy localhost:8080
}
```

*and so on...* You get the idea. This approach works well for services I want/need to be public, but it does require me to manage those DNS records and keep track of which app is on which port. That can be kind of tedious.

And I don't really need all of these services to be public. Not because they're particularly sensitive, but I just don't really have a reason to share my personal [Miniflux](https://github.com/miniflux/v2) or [CyberChef](https://github.com/gchq/CyberChef) instances with the world at large. Those would be great candidates to proxy with [Tailscale Serve](/tailscale-ssh-serve-funnel#tailscale-serve) so they'd only be available on my tailnet. Of course, with that setup I'd then have to differentiate the services based on external port numbers since they'd all be served with the same hostname. That's not ideal either.

```shell
sudo tailscale serve --bg --https 8443 8180 # [tl! .cmd]
Available within your tailnet: # [tl! .nocopy:6]

https://tsdemo.tailnet-name.ts.net/
|-- proxy http://127.0.0.1:8000

https://tsdemo.tailnet-name.ts.net:8443/
|-- proxy http://127.0.0.1:8080
```

It would be really great if I could directly attach each container to my tailnet and then access the apps with addresses like `https://miniflux.tailnet-name.ts.net` or `https://cyber.tailnet-name.ts.net`. Tailscale does have an [official Docker image](https://hub.docker.com/r/tailscale/tailscale), and at first glance it seems like that would solve my needs pretty directly. Unfortunately, it looks like trying to leverage that container image directly would still require me to configure Tailscale Serve interactively.[^ts_serve_config].

{{% notice note "Update: 2024-02-07" %}}
Tailscale [just published a blog post](https://tailscale.com/blog/docker-tailscale-guide) which shares some details about how to configure Funnel and Serve within the official image. The short version is that the `TS_SERVE_CONFIG` variable should point to a `serve-config.json` file. The name of the file doesn't actually matter, but the contents do - and you can generate a config by running `tailscale serve status -json` on a functioning system... or just copy-pasta'ing this example I just made for the [Cyberchef](#cyberchef) setup I describe later in this post:

```json
// torchlight! {"lineNumbers": true}
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "cyber.tailnet-name.ts.net:443": {
      "Handlers": {
        "/": {
          "Proxy": "http://127.0.0.1:8000"
        }
      }
    }
  }//, uncomment to enable funnel
  // "AllowFunnel": {
  //   "cyber.tailnet-name.ts.net:443": true
  // }
}
```

Replace the ports and protocols and hostnames and such, and you'll be good to go.

A compose config using this setup might look something like this:

```yaml
# torchlight! {"lineNumbers": true}
services:
  tailscale:
    image: tailscale/tailscale:latest # [tl! highlight]
    container_name: cyberchef-tailscale
    restart: unless-stopped
    environment:
      TS_AUTHKEY: ${TS_AUTHKEY:?err}
      TS_HOSTNAME: ${TS_HOSTNAME:-ts-docker}
      TS_EXTRA_ARGS: ${TS_EXTRA_ARGS:-}
      TS_STATE_DIR: /var/lib/tailscale/
      TS_SERVE_CONFIG: /config/serve-config.json # [tl! highlight]
    volumes:
      - ./ts_data:/var/lib/tailscale/
      - ./serve-config.json:/config/serve-config.json # [tl! highlight]

  cyberchef:
    container_name: cyberchef
    image: mpepping/cyberchef:latest
    restart: unless-stopped
    network_mode: service:tailscale
```

That's a bit cleaner than the workaround I'd put together, but you're totally welcome to keep on reading if you want to see how it compares.
{{% /notice %}}

[^ts_serve_config]: While not documented for the image itself, the `containerboot` binary seems like it should accept a [`TS_SERVE_CONFIG` argument](https://github.com/tailscale/tailscale/blob/5812093d31c8a7f9c5e3a455f0fd20dcc011d8cd/cmd/containerboot/main.go#L43) to designate the file path of the `ipn.ServeConfig`... but I couldn't find any information on how to actually configure that.

And then I came across [Louis-Philippe Asselin's post](https://asselin.engineer/tailscale-docker) about how he set up Tailscale in Docker Compose. When he wrote his post, there was even less documentation on how to do this stuff, so he used a [modified Tailscale docker image](https://github.com/lpasselin/tailscale-docker) which loads a [startup script](https://github.com/lpasselin/tailscale-docker/blob/c6f8d75b5e1235b8dbeee849df9321f515c526e5/images/tailscale/start.sh) to handle some of the configuration steps. His repo also includes a [helpful docker-compose example](https://github.com/lpasselin/tailscale-docker/blob/c6f8d75b5e1235b8dbeee849df9321f515c526e5/docker-compose/stateful-example/docker-compose.yml) of how to connect it together.

I quickly realized I could modify his startup script to take care of my Tailscale Serve need. So here's how I did it.

### Docker Image
My image starts out basically the same as Louis-Philippe's, with just pulling in the official image and then adding the customized script:

```Dockerfile
# torchlight! {"lineNumbers": true}
FROM tailscale/tailscale:v1.56.1
COPY start.sh /usr/bin/start.sh
RUN chmod +x /usr/bin/start.sh
CMD ["/usr/bin/start.sh"]
```

My `start.sh` script has a few tweaks for brevity/clarity, and also adds a block for conditionally enabling a basic Tailscale Serve (or Funnel) configuration:
```shell
# torchlight! {"lineNumbers": true}
#!/bin/ash
trap 'kill -TERM $PID' TERM INT
echo "Starting Tailscale daemon"
tailscaled --tun=userspace-networking --statedir="${TS_STATE_DIR}" ${TS_TAILSCALED_EXTRA_ARGS} &
PID=$!
until tailscale up --authkey="${TS_AUTHKEY}" --hostname="${TS_HOSTNAME}" ${TS_EXTRA_ARGS}; do
  sleep 0.1
done
tailscale status
if [ -n "${TS_SERVE_PORT}" ]; then # [tl! ++:10]
  if [ -n "${TS_FUNNEL}" ]; then
    if ! tailscale funnel status | grep -q -A1 '(Funnel on)' | grep -q "${TS_SERVE_PORT}"; then
      tailscale funnel --bg "${TS_SERVE_PORT}"
    fi
  else
    if ! tailscale serve status | grep -q "${TS_SERVE_PORT}"; then
      tailscale serve --bg "${TS_SERVE_PORT}"
    fi
  fi
fi
wait ${PID}
```

This script starts the `tailscaled` daemon in userspace mode, and it tells the daemon to store its state in a user-defined location. It then uses a supplied [pre-auth key](https://tailscale.com/kb/1085/auth-keys) to bring up the new Tailscale node and set the hostname.

If both `TS_SERVE_PORT` and `TS_FUNNEL` are set, the script will publicly proxy the designated port with Tailscale Funnel. If only `TS_SERVE_PORT` is set, it will just proxy it internal to the tailnet with Tailscale Serve.[^normal]

[^normal]: If *neither* variable is set, the script just brings up Tailscale like normal... in which case you might as well just use the official image.

I'm using [this git repo](https://github.com/jbowdre/tailscale-docker/) to track my work on this, and it automatically builds my [tailscale-docker](https://github.com/jbowdre/tailscale-docker/pkgs/container/tailscale-docker) image. So now I can can simply reference `ghcr.io/jbowdre/tailscale-docker` in my Docker configurations.

On that note...

### Compose Configuration
There's also a [sample `docker-compose.yml`](https://github.com/jbowdre/tailscale-docker/blob/a54e45ca717023a45d6b1d0aac7143902b02cb0b/docker-compose-example/docker-compose.yml) in the repo to show how to use the image:

```yaml
# torchlight! {"lineNumbers": true}
services:
  tailscale:
    image: ghcr.io/jbowdre/tailscale-docker:latest
    restart: unless-stopped
    container_name: tailscale
    environment:
      TS_AUTHKEY: ${TS_AUTHKEY:?err} # from https://login.tailscale.com/admin/settings/authkeys
      TS_HOSTNAME: ${TS_HOSTNAME:-ts-docker} # optional hostname to use for this node
      TS_STATE_DIR: "/var/lib/tailscale/" # store ts state in a local volume
      TS_TAILSCALED_EXTRA_ARGS: ${TS_TAILSCALED_EXTRA_ARGS:-} # optional extra args to pass to tailscaled
      TS_EXTRA_ARGS: ${TS_EXTRA_ARGS:-} # optional extra flags to pass to tailscale up
      TS_SERVE_PORT: ${TS_SERVE_PORT:-} # optional port to proxy with tailscale serve (ex: '80')
      TS_FUNNEL: ${TS_FUNNEL:-} # if set, serve publicly with tailscale funnel
    volumes:
      - ./ts_data:/var/lib/tailscale/   # the mount point should match TS_STATE_DIR
  myservice:
    image: nginxdemos/hello
    restart: unless-stopped
    network_mode: "service:tailscale" # use the tailscale network service's network
```

You'll note that most of those environment variables aren't actually defined in this YAML. Instead, they'll be inherited from the environment used for spawning the containers. This provides a few benefits. First, it lets the `tailscale` service definition block function as a template to allow copying it into other Compose files without having to modify. Second, it avoids holding sensitive data in the YAML itself. And third, it allows us to set default values for undefined variables (if `TS_HOSTNAME` is empty it will be automatically replaced with `ts-docker`) or throw an error if a required value isn't set (an empty `TS_AUTHKEY` will throw an error and abort).

You can create the required variables by exporting them at the command line (`export TS_HOSTNAME=ts-docker`) - but that runs the risk of having sensitive values like an authkey stored in your shell history. It's not a great habit.

Perhaps a better approach is to set the variables in a `.env` file stored alongside the `docker-compose.yaml` but with stricter permissions. This file can be owned and only readable by root (or the defined Docker user), while the Compose file can be owned by your own user or the `docker` group.

Here's how the `.env` for this setup might look:

```shell
# torchlight! {"lineNumbers": true}
TS_AUTHKEY=tskey-auth-somestring-somelongerstring
TS_HOSTNAME=tsdemo
TS_TAILSCALED_EXTRA_ARGS=--verbose=1
TS_EXTRA_ARGS=--ssh
TS_SERVE_PORT=8080
TS_FUNNEL=1
```

| Variable Name              | Example                                  | Description                                                                                             |
|----------------------------|------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `TS_AUTHKEY`               | `tskey-auth-somestring-somelongerstring` | used for unattended auth of the new node, get one [here](https://login.tailscale.com/admin/settings/keys)                                             |
| `TS_HOSTNAME`              | `tsdemo`                                 | optional Tailscale hostname for the new node[^hostname]                                                            |
| `TS_STATE_DIR`             | `/var/lib/tailscale/`                    | required directory for storing Tailscale state, this should be mounted to the container for persistence |
| `TS_TAILSCALED_EXTRA_ARGS` | `--verbose=1`[^verbose]                            | optional additional [flags](https://tailscale.com/kb/1278/tailscaled#flags-to-tailscaled) for `tailscaled`                                                         |
| `TS_EXTRA_ARGS`            | `--ssh`[^ssh]                                  | optional additional [flags](https://tailscale.com/kb/1241/tailscale-up) for `tailscale up`                                                       |
| `TS_SERVE_PORT`            | `8080`                                   | optional application port to expose with [Tailscale Serve](https://tailscale.com/kb/1312/serve)                                           |
| `TS_FUNNEL`                | `1`                                      | if set (to anything), will proxy `TS_SERVE_PORT` **publicly** with [Tailscale Funnel](https://tailscale.com/kb/1223/funnel)                |

[^hostname]: This hostname will determine the fully-qualified domain name where the resource will be served: `https://[hostname].[tailnet-name].ts.net`. So you'll want to make sure it's a good one for what you're trying to do.
[^verbose]: Passing the `--verbose` flag to `tailscaled` increases the logging verbosity, which can be helpful if you need to troubleshoot.
[^ssh]: The `--ssh` flag to `tailscale up` will enable Tailscale SSH and (ACLs permitting) allow you to easily SSH directly into the *Tailscale* container without having to talk to the Docker host and spawn a shell from there.

A few implementation notes:
- If you want to use Funnel with this configuration, it might be a good idea to associate the [Funnel ACL policy](https://tailscale.com/kb/1223/funnel#tailnet-policy-file-requirement) with a tag (like `tag:funnel`), as I discussed a bit [here](/tailscale-ssh-serve-funnel/#tailscale-funnel). And then when you create the [pre-auth key](https://tailscale.com/kb/1085/auth-keys), you can set it to automatically apply the tag so it can enable Funnel.
- It's very important that the path designated by `TS_STATE_DIR` is a volume mounted into the container. Otherwise, the container will lose its Tailscale configuration when it stops. That could be inconvenient.
- Linking `network_mode` on the application container back to the `service:tailscale` definition is [the magic](https://docs.docker.com/compose/compose-file/05-services/#network_mode) that lets the sidecar proxy traffic for the app. This way the two containers effectively share the same network interface, allowing them to share the same ports. So port `8080` on the app container is available on the tailscale container, and that enables `tailscale serve --bg 8080` to work.

### Usage Examples

To tie this all together, I'm going to quickly run through the steps I took to create and publish two container-based services without having to do any interactive configuration.

#### CyberChef

I'll start with my [CyberChef](https://github.com/gchq/CyberChef) instance.

> *CyberChef is a simple, intuitive web app for carrying out all manner of "cyber" operations within a web browser. These operations include simple encoding like XOR and Base64, more complex encryption like AES, DES and Blowfish, creating binary and hexdumps, compression and decompression of data, calculating hashes and checksums, IPv6 and X.509 parsing, changing character encodings, and much more.*

This will be served publicly with Funnel so that my friends can use this instance if they need it.

I'll need a pre-auth key so that the Tailscale container can authenticate to my Tailnet. I can get that by going to the [Tailscale Admin Portal](https://login.tailscale.com/admin/settings/keys) and generating a new auth key. I gave it a description, ticked the option to pre-approve whatever device authenticates with this key (since I have [Device Approval](https://tailscale.com/kb/1099/device-approval) enabled on my tailnet). I also used the option to auto-apply the `tag:internal` tag I used for grouping my on-prem systems as well as the `tag:funnel` tag I use for approving Funnel devices in the ACL.

![authkey creation](authkey1.png)

That gives me a new single-use authkey:

![new authkey](authkey2.png)

I'll use that new key as well as the knowledge that CyberChef is served by default on port `8000` to create an appropriate `.env` file:

```shell
# torchlight! {"lineNumbers": true}
TS_AUTHKEY=tskey-auth-somestring-somelongerstring
TS_HOSTNAME=cyber
TS_EXTRA_ARGS=--ssh
TS_SERVE_PORT=8000
TS_FUNNEL=true
```

And I can add the corresponding `docker-compose.yml` to go with it:

```yaml
# torchlight! {"lineNumbers": true}
services:
  tailscale: # [tl! focus:start]
    image: ghcr.io/jbowdre/tailscale-docker:latest
    restart: unless-stopped
    container_name: cyberchef-tailscale
    environment:
      TS_AUTHKEY: ${TS_AUTHKEY:?err}
      TS_HOSTNAME: ${TS_HOSTNAME:-ts-docker}
      TS_STATE_DIR: "/var/lib/tailscale/"
      TS_TAILSCALED_EXTRA_ARGS: ${TS_TAILSCALED_EXTRA_ARGS:-}
      TS_EXTRA_ARGS: ${TS_EXTRA_ARGS:-}
      TS_SERVE_PORT: ${TS_SERVE_PORT:-}
      TS_FUNNEL: ${TS_FUNNEL:-}
    volumes:
      - ./ts_data:/var/lib/tailscale/ # [tl! focus:end]
  cyberchef:
    container_name: cyberchef
    image: mpepping/cyberchef:latest
    restart: unless-stopped
    network_mode: service:tailscale # [tl! focus]
```

I can just bring it online like so:
```shell
docker compose up -d # [tl! .cmd .nocopy:1,4]
[+] Running 3/3
 ✔ Network cyberchef_default      Created
 ✔ Container cyberchef-tailscale  Started
 ✔ Container cyberchef            Started
```

I can review the logs for the `tailscale` service to confirm that the Funnel configuration was applied:
```shell
docker compose logs tailscale # [tl! .cmd .nocopy:1,12 focus]
cyberchef-tailscale  | # Health check:
cyberchef-tailscale  | #     - not connected to home DERP region 12
cyberchef-tailscale  | #     - Some peers are advertising routes but --accept-routes is false
cyberchef-tailscale  | 2023/12/30 17:44:48 serve: creating a new proxy handler for http://127.0.0.1:8000
cyberchef-tailscale  | 2023/12/30 17:44:48 Hostinfo.WireIngress changed to true
cyberchef-tailscale  | Available on the internet: # [tl! focus:6]
cyberchef-tailscale  |
cyberchef-tailscale  | https://cyber.tailnet-name.ts.net/
cyberchef-tailscale  | |-- proxy http://127.0.0.1:8000
cyberchef-tailscale  |
cyberchef-tailscale  | Funnel started and running in the background.
cyberchef-tailscale  | To disable the proxy, run: tailscale funnel --https=443 off
```

And after ~10 minutes or so (it sometimes takes a bit longer for the DNS and SSL to start working outside the tailnet), I'll be able to hit the instance at `https://cyber.tailnet-name.ts.net` from anywhere on the web.

![cyberchef](cyberchef.png)


#### Miniflux
I've lately been playing quite a bit with [my omg.lol address](https://jbowdre.omg.lol/) and [associated services](https://home.omg.lol/referred-by/jbowdre), and that's inspired me to [revisit the world](https://rknight.me/blog/the-web-is-fantastic/) of curating RSS feeds instead of relying on algorithms to keep me informed. Through that experience, I recently found [Miniflux](https://github.com/miniflux/v2), a "Minimalist and opinionated feed reader". It's written in Go, is fast and lightweight, and works really well as a PWA installed on mobile devices, too.

It will be great for keeping track of my feeds, but I need to expose this service publicly. So I'll serve it up inside my tailnet with Tailscale Serve.

Here's the `.env` that I'll use:
```shell
# torchlight! {"lineNumbers": true}
DB_USER=db-username
DB_PASS=db-passw0rd
ADMIN_USER=sysadmin
ADMIN_PASS=hunter2
TS_AUTHKEY=tskey-auth-somestring-somelongerstring
TS_HOSTNAME=miniflux
TS_EXTRA_ARGS=--ssh
TS_SERVE_PORT=8080
```

Funnel will not be configured for this since `TS_FUNNEL` was not defined.

I adapted the [example `docker-compose.yml`](https://miniflux.app/docs/dacker.html#docker-compose) from Miniflux to add in my Tailscale bits:
```yaml
# torchlight! {"lineNumbers": true}
services:
  tailscale: # [tl! focus:start]
    image: ghcr.io/jbowdre/tailscale-docker:latest
    restart: unless-stopped
    container_name: miniflux-tailscale
    environment:
      TS_AUTHKEY: ${TS_AUTHKEY:?err}
      TS_HOSTNAME: ${TS_HOSTNAME:-ts-docker}
      TS_STATE_DIR: "/var/lib/tailscale/"
      TS_TAILSCALED_EXTRA_ARGS: ${TS_TAILSCALED_EXTRA_ARGS:-}
      TS_EXTRA_ARGS: ${TS_EXTRA_ARGS:-}
      TS_SERVE_PORT: ${TS_SERVE_PORT:-}
      TS_FUNNEL: ${TS_FUNNEL:-}
    volumes:
      - ./ts_data:/var/lib/tailscale/ # [tl! focus:end]
  miniflux:
    image: miniflux/miniflux:latest
    restart: unless-stopped
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
    network_mode: "service:tailscale" # [tl! focus]
  db:
    image: postgres:15
    restart: unless-stopped
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

I can bring it up with:
```shell
docker compose up -d # [tl! .cmd .nocopy:1,5]
[+] Running 4/4
 ✔ Network miniflux_default       Created
 ✔ Container miniflux-db          Started
 ✔ Container miniflux-tailscale   Started
 ✔ Container miniflux             Created
```

And I can hit it at `https://miniflux.tailnet-name.ts.net` from within my tailnet:

![miniflux](miniflux.png)

Nice, right? Now to just convert all of my other containerized apps that don't really need to be public. Fortunately that shouldn't take too long since I've got this nice, portable, repeatable Docker Compose setup I can use.

Maybe I'll write about something *other* than Tailscale soon. Stay tuned!