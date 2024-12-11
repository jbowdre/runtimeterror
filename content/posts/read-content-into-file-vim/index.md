---
title: "Read Content Into a File with Vim"
date: 2024-12-10 21:42:17-06:00
# lastmod: 2024-12-07
draft: false
description: "Using Vim's :r[ead] command to import content from another file or insert command output without leaving the editor."
featured: false
toc: true
reply: true
categories: Tips # Backstage, ChromeOS, Code, Self-Hosting, VMware
tags:
  - linux
  - shell
---

I've been comfortable working with Vim for what feels like ages, but I still regularly learn about features and capabilities I'd overlooked.

I recently discovered [Vim's `:r[ead]` command](https://vimhelp.org/insert.txt.html#%3Aread) which makes it easy to insert data from another file. I put this to use when I was configuring Netplan on a Linux VM while connected through a remote console session (without copy/paste support) and needed to include an interface's MAC address. Through the magic of Vim, I was able to pull that data straight into the file. For example:

```yaml
network:
  ethernets:
    ens18:
      [...]
      match:
        macaddress: # and then I entered...
`<Esc>:r /sys/class/net/ens18/address<CR>`
```

I hit `<Esc>` to switch to normal mode, invoked the `:r[ead]` command, and pointed it to the `/sys` file which holds the MAC address for the interface. The address was then inserted straight into the file:

```yaml
network:
  ethernets:
    ens18:
      [...]
      match:
        macaddress:
de:ad:be:ef:ca:fe # [tl! ~~]
```

`:r[ead]` inserts the extracted content on the line *after* the cursor so I just needed to quickly back it up to the `macaddress` line but that was still a pretty easy exercise.

```yaml
network:
  ethernets:
    ens18:
      [...]
      match:
        macaddress: de:ad:be:ef:ca:fe # [tl! ~~]
```

This approach also works well for capturing output from a command with `:r !command`, such as generating a random password for a Docker Compose stack:

```yaml
services:
  my_app:
    [...]
    environment:
      DB_SECRET:
`<Esc>:r !apg -M NCL -m 32 -a 1 -n 1`
```

would yield something like:


```yaml
services:
  my_app:
    [...]
    environment:
      DB_SECRET:
Cn6kp5y2BBk0VvAisULO4dxkXaGyFJ4f # [tl! ~~]
```

And again just a quick bit of rearranging...


```yaml
services:
  my_app:
    [...]
    environment:
      DB_SECRET: Cn6kp5y2BBk0VvAisULO4dxkXaGyFJ4f # [tl! ~~]
```

Being able to merge in data from elsewhere without leaving the editor is a pretty slick trick, don't you think?

