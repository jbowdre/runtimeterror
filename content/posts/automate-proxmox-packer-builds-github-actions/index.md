---
title: "Automate Proxmox Packer Builds Github Actions"
date: 2024-07-21
# lastmod: 2024-07-21
draft: true
description: "This is a new post about..."
featured: false
toc: true
reply: true
categories: Code
tags:
  - api
  - automation
  - containers
  - docker
  - iac
  - linux
  - packer
  - proxmox
  - selfhosting
  - shell
  - tailscale
---

I recently shared how I [set up Packer to build Proxmox templates](building-proxmox-templates-packer) in my homelab. That post covered storing (and retrieving) environment-specific values in Vault, the `cloud-init` configuration for definiting the installation parameters, the various post-install scripts for further customizing and hardening the template, and the Packer template files that tie it all together. By the end of the post, I was able to simply run `./build.sh ubuntu2204` to kick the build of a new Ubuntu 22.04 template without having to do any other interaction with the process.

That's pretty slick, but *The Dream* is to not have to do anything at all. So that's what this post is about: describing setting up a rootless self-hosted GitHub Actions Runner to perform the build, and the GitHub Actions workflows to trigger it.

### Self-Hosted Runner
When a GitHub Actions workflow fires, it schedules the job(s) to run on GitHub's own infrastructure. That's easy and convenient, but can make things tricky when you need a workflow to interact with on-prem infrastructure. I've worked around that in the past by [configuring the runner to connect to my tailnet](/gemini-capsule-gempost-github-actions/#publish-github-actions), but given the amount of data that will need to be transferred during the Packer build I decided that a [self-hosted runner](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners) would be a better solution.

I wanted my runner to execute the build inside of a Docker container so that I could control that environment a bit more, and I also wanted to ensure that it would run [without elevated permissions](https://docs.docker.com/engine/security/rootless/). It took a bit of fiddling to get there, but I'm pretty pleased with the result!

{{% notice note "Self-Hosted Runner Security" %}}
GitHub [strongly recommends](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#self-hosted-runner-security) that you only use self-hosted runners with **private** repositories. You don't want a misconfigured workflow to allow a pull request submitted from a fork to run potentially-malicious code on your system(s).

So while I have a [public repo](https://github.com/jbowdre/packer-proxmox-templates/) to share my Packer work, my runner environment is attached to an otherwise-identical private repo. I'd recommend following a similar setup.
{{% /notice %}}

#### Setup Rootless Docker Host
I started by cloning a fresh Ubuntu 22.04 VM off of my new template. After doing the basic initial setup (setting the hostname and IP, connecting it Tailscale), I then created a user account for the runner to use. That account will need sudo privileges during the initial setup, but then I can revoke that access. I also set a password for the account.

```shell
sudo useradd -m -G sudo -s $(which bash) github # [tl! .cmd:1]
sudo passwd github
```

I then installed the `systemd-container` package so that I could use [`machinectl`](https://www.man7.org/linux/man-pages/man1/machinectl.1.html) to log in as the new user (since [`sudo su` won't work for the rootless setup](https://docs.docker.com/engine/security/rootless/#unable-to-install-with-systemd-when-systemd-is-present-on-the-system)).

```shell
sudo apt update # [tl! .cmd:2]
sudo apt install systemd-container
sudo machinectl shell github@
```

And I installed the `uidmap` package since rootless Docker requires `newuidmap` and `newgidmap`:

```shell
sudo apt install uidmap # [tl! .cmd]
```

At this point, I just followed the usual [Docker installation instructions](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository):

```shell
# Add Docker's official GPG key:
sudo apt-get update # [tl! .cmd:4]
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \ # [tl! .cmd]
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update # [tl! .cmd]

sudo apt-get install \ # [tl! .cmd]
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

Then the actual rootless setup can begin. That starts by disabling the existing Docker service and socket and then running the `dockerd-rootless-setuptool.sh` script:

```shell
sudo systemctl disable --now docker.service docker.socket # [tl! .cmd:1]
sudo rm /var/run/docker.sock

dockerd-rootless-setuptool.sh install # [tl! .cmd]
```

After that, I started and enabled the service in the user context and enabled "linger" for the `github` user so that its systemd instance can continue to function even while the user is not logged in:

```shell
systemctl --user start docker # [tl! .cmd:2]
systemctl --user enable docker
sudo loginctl enable-linger $(whoami)
```

That should take care of setting up Docker, and I can quickly confirm by spawning the `hello-world` container:

```shell
docker run hello-world # [tl! .cmd]
Unable to find image 'hello-world:latest' locally # [tl! .nocopy:25]
latest: Pulling from library/hello-world
c1ec31eb5944: Pull complete
Digest: sha256:1408fec50309afee38f3535383f5b09419e6dc0925bc69891e79d84cc4cdcec6
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

So the Docker piece is sorted; now for setting up the runner.

#### Install/Configure Runner
I know I've been talking about a singular runner, but I actually set up multiple instances of the runner on the same host to allow running jobs in parallel. I could probably support four simultaneous builds in my homelab but I'll settle two runners for now (after all, I only have two build flavors so far anyway).

Each runner instance needs its own folder structure so I started by setting that up under `/opt/github/`:

```shell
sudo mkdir -p /opt/github/runner{1..2} # [tl! .cmd:2]
sudo chown -R github:github /opt/github
cd /opt/github
```

And then I downloaded the latest runner package:

```shell
curl -O -L https://github.com/actions/runner/releases/download/v2.317.0/actions-runner-linux-x64-2.317.0.tar.gz # [tl! .cmd]
```

For each runner, I:
- Extracted the runner software into the designated directory and `cd`'d to there:
    ```shell
    tar xzf ./actions-runner-linux-x64-2.317.0.tar.gz --directory=runner1 # [tl! .cmd:1]
    cd runner1
    ```
- Went to my private GitHub repo and navigated to **Settings > Actions > Runners** and clicked the big friendly **New self-hosted runner** button at the top-right of the page. All I really need from that is the token which appears in the **Configure** section. Once I had that token, I...
- Ran the configuration script, accepting the defaults for every prompt *except* for the runner name, which must be unique within the repository (so `runner1`, `runner2`, so on):
    ```shell
    ./config.sh \ # [tl! **:2 .cmd]
      --url https://github.com/[GITHUB_USERNAME]/[GITHUB_REPO] \
      --token [TOKEN] # [tl! .nocopy:1,35]

    --------------------------------------------------------------------------------
    |        ____ _ _   _   _       _          _        _   _                      |
    |       / ___(_) |_| | | |_   _| |__      / \   ___| |_(_) ___  _ __  ___      |
    |      | |  _| | __| |_| | | | | '_ \    / _ \ / __| __| |/ _ \| '_ \/ __|     |
    |      | |_| | | |_|  _  | |_| | |_) |  / ___ \ (__| |_| | (_) | | | \__ \     |
    |       \____|_|\__|_| |_|\__,_|_.__/  /_/   \_\___|\__|_|\___/|_| |_|___/     |
    |                                                                              |
    |                       Self-hosted runner registration                        |
    |                                                                              |
    --------------------------------------------------------------------------------

    # Authentication


    √ Connected to GitHub

    # Runner Registration

    Enter the name of the runner group to add this runner to: [press Enter for Default]

    Enter the name of runner: [press Enter for runner] runner1 # [tl! ** ~~]

    This runner will have the following labels: 'self-hosted', 'Linux', 'X64'
    Enter any additional labels (ex. label-1,label-2): [press Enter to skip]

    √ Runner successfully added
    √ Runner connection is good

    # Runner settings

    Enter name of work folder: [press Enter for _work]

    √ Settings Saved.

    ```
- Configure it to run as a user service:
    ```shell
    sudo ./svc.sh install $(whoami) # [tl! .cmd:1]
    sudo ./svc.sh start $(whoami)
    ```

Once all of the runner instances are configured I removed the `github` user from the `sudo` group:

```shell
sudo deluser github sudo # [tl! .cmd]
```


