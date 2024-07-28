---
title: "Taking Taildrive for a Testdrive"
date: 2024-07-28
# lastmod: 2024-07-28
draft: true
description: "This is a new post about..."
featured: false
toc: true
reply: true
categories: Tips # Backstage, ChromeOS, Code, Self-Hosting, VMware
tags:
  - linux
  - tailscale
---
My little [homelab](/homelab) is perhaps a bit different from most in that I don't have any dedicated storage setup. This can sometimes make sharing files between systems a little bit tricky. I've used workarounds like [Tailscale Serve](/tailscale-ssh-serve-funnel/#tailscale-serve) for sharing files over HTTP or simply `scp`ing files around as needed, but none of those solutions are really very elegant.

Last week, Tailscale announced [a new integration](https://tailscale.com/blog/controld) with [ControlD](https://controld.com/) to add advanced DNS filtering and security. While I was getting that set up on my tailnet, I stumbled across an option I hadn't previously noticed in the Tailscale CLI: the `tailscale drive` command:

> Share a directory with your tailnet
>
> USAGE
>   `tailscale drive share <name> <path>`
>   `tailscale drive rename <oldname> <newname>`
>   `tailscale drive unshare <name>`
>   `tailscale drive list`
>
> Taildrive allows you to share directories with other machines on your tailnet.

That sounded kind of neat - especially once I found the corresponding [Taildrive documentation](https://tailscale.com/kb/1369/taildrive) and started to get a better understanding of how this new(ish) feature works:

> Normally, maintaining a file server requires you to manage credentials and access rules separately from the connectivity layer. Taildrive offers a file server that unifies connectivity and access controls, allowing you to share directories directly from the Tailscale client. You can then use your tailnet policy file to define which members of your tailnet can access a particular shared directory, and even define specific read and write permissions.
>
> Beginning in version 1.64.0, the Tailscale client includes a WebDAV server that runs on `100.100.100.100:8080` while Tailscale is connected. Every directory that you share receives a globally-unique path consisting of the tailnet, the machine name, and the share name: `/tailnet/machine/share`.
>
> For example, if you shared a directory with the share name `docs` from the machine `mylaptop` on the tailnet `mydomain.com`, the share's path would be `/mydomain.com/mylaptop/docs`.

Oh yeah. That will be a huge simplification for how I share files within my tailnet.

I've finally had a chance to get this implemented and am pretty pleased with the results so far. Here's how I did it.

### ACL Changes
My Tailscale policy relies heavily on [ACL tags](https://tailscale.com/kb/1068/acl-tags) to manage access between systems, and especially for server nodes which don't typically have a user logging on to them directly. I don't necessarily want every system to be able to export a file share so I decided to control that capability with a new `tag:share` flag. Before I can use that tag, though, I need to [add it to the ACL](https://tailscale.com/kb/1068/acl-tags#define-a-tag):

```json
{
  "groups": {
    "group:admins": ["user@example.com"],
  },
  "tagOwners": {
    "tag:share": ["group:admins"],
  },
  {...},
}
```

Next I needed to add the appropriate [node attributes](https://tailscale.com/kb/1337/acl-syntax#nodeattrs) to enable Taildrive:

```json
{
  "nodeAttrs": {
    {
      // devices with the share tag can share files with Taildrive
      "target": ["tag:share"],
      "attr": ["drive:share"],
    },
    {
      // all devices can access shares
      "target": ["*"],
      "attr": ["drive:access"],
    },
  },
  {...},
}
```

And I created a pair of [Grants](https://tailscale.com/kb/1324/acl-grants) to give logged-in users read-write access and tagged devices read-only access:

```json
{
  "grants":[
    {
      // users get read-write access to shares
      "src": ["autogroup:member"],
      "dst": ["tag:share"],
      "app": {
        "tailscale.com/cap/drive": [{
          "shares": ["*"],
          "access": "rw"
        }]
      }
    },
    {
      // tagged devices get read-only access
      "src": ["autogroup:tagged"],
      "dst": ["tag:share"],
      "app": {
        "tailscale.com/cap/drive": [{
          "shares": ["*"],
          "access": "ro"
        }]
      }
    }
  ],
  {...},
}
```

Then I just used the Tailscale admin portal to add the new `tag:share` tag to my existing `files` node:

![The files node tagged with `tag:internal`, `tag:salt-minion`, and `tag:share`](files-tags.png)

### Exporting the Share
After making the required ACL changes, actually publishing the share was very straightforward. Per the [`tailscale drive --help` output](https://paste.jbowdre.lol/tailscale-drive), the syntax is:

```shell
tailscale drive share <name> <path> # [tl! .cmd]
```

I (somewhat-confusingly) wanted to share a share named `share`, found at `/home/john/share`... so I used this to export it:

```shell
tailscale drive share share /home/john/share # [tl! .cmd]
```

And I could  verify that `share` had, in fact, been shared with:

```shell
tailscale drive list # [tl! .cmd]
name     path                as # [tl! .nocopy:2]
-----    ----------------    ----
share    /home/john/share    john
```

### Mounting the Share
In order to mount the share from the Debian environment on my Chromebook, I first needed to install the `davfs2` package to add support for mounting WebDAV shares:

```shell
sudo apt update # [tl! .cmd:1]
sudo apt install davfs2
```

I then added my user to the `davfs2` group so that I could mount WebDAV shares without needing `sudo` access:

```shell
sudo usermod -aG davfs2 $USER # [tl! .cmd]
```

And used `newgrp` to activate that membership without needing to log out and back in again:

```shell
newgrp davfs2 # [tl! .cmd]
```

I also created a folder inside my home directory to use as a mountpoint:

```shell
mkdir ~/taildrive # [tl! .cmd]
```

I knew from the [Taildrive docs](https://tailscale.com/kb/1369/taildrive) that the WebDAV server would be running at `http://100.100.100.100:8080` and the share would be available at `/<tailnet>/<machine>/<share>`, so I added the following to my `/etc/fstab`:

```txt
 http://100.100.100.100:8080/example.com/files/share /home/john/taildrive/ davfs user,rw,noauto 0 0
```

Then I ran `sudo systemctl daemon-reload` to make sure the system knew about the changes to the fstab.

And to avoid being prompted for (unnecessary) credentials when attempting to mount the taildrive, I added this to the bottom of `~/.davfs2/secrets`:

```txt
/home/john/taildrive john ""
```

After that, I could mount the share like so:

```shell
mount ~/taildrive # [tl! .cmd]
```

And verify that I could see the files being shared from `share` on `files`:

```shell
ls -l ~/taildrive # [tl! .cmd]
drwxr-xr-x  - john 15 Feb 09:20 books # [tl! .nocopy:5]
drwxr-xr-x  - john 22 Oct  2023 dist
drwx------  - john 28 Jul 15:10 lost+found
drwxr-xr-x  - john 22 Nov  2023 media
drwxr-xr-x  - john 16 Feb  2023 notes
.rw-r--r-- 18 john 10 Jan  2023 status
```

Neat, right?