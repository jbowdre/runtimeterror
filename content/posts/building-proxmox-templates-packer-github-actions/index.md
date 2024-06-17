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

I've been [using Proxmox](/ditching-vsphere-for-proxmox/) in my [homelab](/homelab/) for a little while now, and I recently expanded the environment a bit with the addition of two HP Elite Mini 800 G9 computers. I figured it was time to start automating the process of building and maintaining my VM templates. I already had functional [Packer templates for VMware](https://github.com/jbowdre/packer-vsphere-templates) so I used that content as a starting point for the Proxmox builds themselves. Once I had the builds working locally, I just had to explore how to automate them.

This post will describe how I did it. It will cover a lot of the implementation details but may gloss over some general setup steps; you'll likely need at least passing familiarity with [Packer](https://www.packer.io/) and [Vault](https://www.vaultproject.io/) to take this on.

### Component Overview
There are a lot of parts to this setup, so let's start by quickly running through those:
- a **Proxmox host** to serve the virtual infrastructure and provide compute for the new templates,
- a **Vault instance** running in a container in the lab to hold the secrets needed for the builds,
- an **on-premise self-hosted GitHub runner** to simplify connectivity between GitHub and my homelab,
- and a **private GitHub repo** to hold the code and tell the runner when it's time to get to work.

{{% notice note "Private Repo!" %}}
GitHub [strongly recommends](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#self-hosted-runner-security) that self-hosted runners *only* be used with private repositories.
> This is because forks of your public repository can potentially run dangerous code on your self-hosted runner machine by creating a pull request that executes the code in a workflow.

I don't like the idea of randos running arbitrary code on my home infrastructure. So while I'm sharing my work publicly [in this repo](https://github.com/jbowdre/packer-proxmox-templates), the workflows there are disabled and there are no connected runners. I'm running my builds out of a private repo and recommend that you do the same.
{{% /notice %}}

### Proxmox Setup
The only configuration I did on the Proxmox side of things was to [create a user account](https://pve.proxmox.com/pve-docs/chapter-pveum.html#pveum_users) that Packer could use. I call it `packer` but don't set a password for it. Instead, I'll set up an [API token](https://pve.proxmox.com/pve-docs/chapter-pveum.html#pveum_tokens) for that account, making sure to uncheck the "Privilege Separation" box so that the token will inherit the same permissions as the user itself.

![Creating an API token](proxmox-token.png)

To use the token, I'll need the ID (in the form `USERNAME@REALM!TOKENNAME`) and the UUID-looking secret, which is only displayed once so I be sure to record it in a safe place.

Speaking of privileges, the [Proxmox ISO integration documentation](https://developer.hashicorp.com/packer/integrations/hashicorp/proxmox/latest/components/builder/iso) didn't offer any details on the minimum required permissions, and none of my attempts worked until I eventually assigned the Administrator role to the `packer` user.

Otherwise I'll just need to figure out the details like which network bridge, ISO storage, and VM storage the Packer-built VMs should use.

### Vault Configuration
I use [Vault](https://github.com/hashicorp/vault) to hold the configuration details for the template builds - not just traditional secrets like usernames and passwords, but basically *every environment-specific setting* as well. This approach lets others use my Packer code without having to change much (if any) of it; every value that I expect to change between environments is retrieved from Vault at run time.

Because this is just a homelab, I'm using [Vault in Docker](https://hub.docker.com/r/hashicorp/vault), and I'm making it available within my tailnet with [Tailscale Serve](/tailscale-serve-docker-compose-sidecar/) using the following `docker-compose.yaml`

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

And I define a [policy](https://developer.hashicorp.com/vault/docs/concepts/policies) which will grant the bearer read-only access to the data stored in the `packer` secrets as well as the ability to create and update its own token:

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

Within the `packer` secrets engine, I have two secrets which each have a number of subkeys:
`proxmox` contains values related to the Proxmox environment:
| Key                   | Example value                                 | Description                                                                                                              |
|-----------------------|-----------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| `api_url`             | `https://proxmox1.example.com:8006/api2/json` | URL to the Proxmox API                                                                                                   |
| `insecure_connection` | `true`                                        | set to `false` if your Proxmox host has a valid certificate                                                              |
| `iso_path`            | `local:iso`                                   | path for (existing) ISO storage                                                                                          |
| `iso_storage_pool`    | `local`                                       | pool for storing created/uploaded ISOs                                                                                   |
| `network_bridge`      | `vmbr0`                                       | bridge the VM's NIC will be attached to                                                                                  |
| `node`                | `proxmox1`                                    | node name where the VM will be built                                                                                     |
| `token_id`            | `packer@pve!packer`                           | ID for an [API token](https://pve.proxmox.com/wiki/User_Management#pveum_tokens), in the form `USERNAME@REALM!TOKENNAME` |
| `token_secret`        | `3fc69f[...]d2077eda`                         | secret key for the token                                                                                                 |
| `vm_storage_pool`     | `zfs-pool`                                    | storage pool where the VM will be created                                                                                |

`linux` holds values for the created VM template(s)
| Key                   | Example value                                             | Description                                                                                     |
|-----------------------|-----------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| `bootloader_password` | `bootplease`                                              | Grub bootloader password to set                                                                 |
| `password_hash`       | `$6$rounds=4096$NltiNLKi[...]a7Shax41`                    | hash of the build account's password (example generated with `mkpasswd -m sha512crypt -R 4096`) |
| `public_key`          | `ssh-ed25519 AAAAC3NzaC1[...]lXLUI5I40 admin@example.com` | SSH public key for the user                                                                     |
| `username`            | `admin`                                                   | build account username                                                                          |

