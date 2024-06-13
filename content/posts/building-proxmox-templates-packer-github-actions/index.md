---
title: "Building Proxmox Templates with Packer and GitHub Actions"
date: 2024-06-12
# lastmod: 2024-06-12
draft: true
description: "Using Packer, Vault, a GitHub Actions workflow, and self-hosted runners to automatically build VM templates for my Proxmox homelab."
featured: false
toc: true
reply: true
categories: Tips
tags:
  - automation
  - cicd
  - docker
  - homelab
  - iac
  - linux
  - packer
  - proxmox
  - tailscale
  - vault
---

I've been [using Proxmox](/ditching-vsphere-for-proxmox/) in my [homelab](/homelab/) for a little while now, and I recently expanded the environment a bit with the addition of two HP Elite Mini 800 G9 computers. I figured it was time to start automating the process of building and maintaining my VM templates. I already had functional [Packer templates for VMware](https://github.com/jbowdre/packer-vsphere-templates) so I used that content as a starting point for the builds themselves. Once I had the builds working locally, I just had to explore how to automate them.

This post will describe how I did it.

### Component Overview
There are a lot of parts to this setup, so let's start by quickly running through those:
- a **Vault instance** running in a container in the lab to hold the secrets needed for the builds,
- a **Proxmox host** to serve the virtual infrastructure and provide compute for the new templates,
- an **on-premise self-hosted GitHub runner** to simplify connectivity between GitHub and my homelab,
- and a **private GitHub repo** to hold the code and tell the runner when it's time to get to work.

{{% notice note "Private Repo!" %}}
GitHub [strongly recommends](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#self-hosted-runner-security) that self-hosted runners *only* be used with private repositories.
> This is because forks of your public repository can potentially run dangerous code on your self-hosted runner machine by creating a pull request that executes the code in a workflow.

I don't like the idea of randos running arbitrary code on my home infrastructure. So while I'm sharing my work publicly [in this repo](https://github.com/jbowdre/packer-proxmox-templates), the workflows there are disabled and there are no connected runners. I'm running my builds out of a private repo and recommend that you do the same.
{{% /notice %}}

### Vault
I use [Vault](https://github.com/hashicorp/vault) to hold the configuration details for the template builds - not just traditional secrets like usernames and passwords, but basically *every environment-specific setting* as well. This way the Packer templates can be used in different environments without having to change much (if *any*) of the committed code.

I'm using [Vault in Docker](https://hub.docker.com/r/hashicorp/vault), and I'm also making it available within my tailnet with [Tailscale Serve](/tailscale-serve-docker-compose-sidecar/) using the following `docker-compose.yaml`

```yaml
# torchlight! {"lineNumbers":true}
services:
  tailscale:
    image: tailscale/tailscale:latest
    container_name: vault-tailscaled
    restart: unless-stopped
    environment:
      TS_AUTHKEY: ${TS_AUTHKEY:?err}
      TS_HOSTNAME: vault
      TS_STATE_DIR: "/var/lib/tailscale/"
      TS_SERVE_CONFIG: /config/serve-config.json
    volumes:
      - ./ts_data:/var/lib/tailscale/
      - ./serve-config.json:/config/serve-config.json

  vault:
    image: hashicorp/vault
    container_name: vault
    restart: unless-stopped
    environment:
      VAULT_ADDR: 'https://0.0.0.0:8200'
    cap_add:
      - IPC_LOCK
    volumes:
      - ./data:/vault/data
      - ./config:/vault/config
      - ./log:/vault/log
    command: vault server -config=/vault/config/vault.hcl
    network_mode: "service:tailscale"
```

Vault's `./config/vault.hcl`:

```hcl
ui = true

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = "true"
}

storage "file" {
  path = "/vault/data"
}
```

And Tailscale's `./serve-config.json`:

```json
# torchlight! {"lineNumbers":true}
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "vault.tailnet-name.ts.net:443": {
      "Handlers": {
        "/": {
          "Proxy": "http://127.0.0.1:8200"
        }
      }
    }
  }
}
```

After performing the initial Vault setup, I then create a [kv-v2](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2) secrets engine
for Packer to use:

```shell
vault secrets enable -path=packer kv-v2 # [tl! .cmd]
Success! Enabled the kv-v2 secrets engine at: packer/ # [tl! .nocopy]
```

And I define a [policy](https://developer.hashicorp.com/vault/docs/concepts/policies) which will grant the bearer read-only access to the data stored in the `packer` secrets as well as the ability to create and update its own tokens:

```shell
cat << EOF | vault policy write packer -
path "packer/*" {
  capabilities = ["read", "list"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/create" {
  capabilities = ["create", "update"]
}
EOF # [tl! .cmd:-12,1]

Success! Uploaded policy: packer2 # [tl! .nocopy]
```

Now I just need to create a token attached to the policy:

```shell
vault token create -policy=packer -no-default-policy
  -orphan -ttl=4h -period=336h -display-name=packer # [tl! .cmd:-1,1 ]

Key                  Value # [tl! .nocopy:8]
---                  -----
token                hvs.CAES[...]GSFQ
token_accessor       aleV[...]xu5I
token_duration       336h
token_renewable      true
token_policies       ["packer"]
identity_policies    []
policies             ["packer"]
```

Within the `packer` secrets engine, I have two secrets which each have a number of subkeys.

