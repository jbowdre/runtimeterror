---
title: "Taking Taildrive for a Testdrive"
date: "2024-07-29T23:48:29Z"
lastmod: "2024-07-30T13:59:50Z"
description: "A quick exploration of Taildrive, Tailscale's new(ish) feature to easily share directories with other machines on your tailnet without having to juggle authentication or network connectivity."
featured: false
toc: true
reply: true
categories: Tips
tags:
  - linux
  - tailscale
---
My little [homelab](/homelab) is bit different from many others in that I don't have a SAN/NAS or other dedicated storage setup. This can sometimes make sharing files between systems a little bit tricky. I've used workarounds like [Tailscale Serve](/tailscale-ssh-serve-funnel/#tailscale-serve) for sharing files over HTTP or simply `scp`ing files around as needed, but none of those solutions are really very elegant.

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

I've now had a chance to get this implemented on my tailnet and thought I'd share some notes on how I did it.

### ACL Changes
My Tailscale policy relies heavily on [ACL tags](https://tailscale.com/kb/1068/acl-tags) to manage access between systems, especially for "headless" server systems which don't typically have users logged in to them. I don't necessarily want every system to be able to export a file share so I decided to control that capability with a new `tag:share` flag. Before I could use that tag, though, I had to [add it to the ACL](https://tailscale.com/kb/1068/acl-tags#define-a-tag):

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

Next I needed to add the appropriate [node attributes](https://tailscale.com/kb/1337/acl-syntax#nodeattrs) to enable Taildrive sharing on devices with that tag and Taildrive access for all other systems:

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

That will let me create/manage files from the devices I regularly work on, and easily retrieve them as needed on the others.

Then I just used the Tailscale admin portal to add the new `tag:share` tag to my existing `files` node:

![The files node tagged with `tag:internal`, `tag:salt-minion`, and `tag:share`](files-tags.png)

### Exporting the Share
After making the required ACL changes, actually publishing the share was very straightforward. Per the [`tailscale drive --help` output](https://paste.jbowdre.lol/tailscale-drive), the syntax is:

```shell
tailscale drive share <name> <path> # [tl! .cmd]
```

I (somewhat-confusingly) wanted to share a share named `share`, found at `/home/john/share` (I *might* be bad at naming things) so I used this to export it:

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
In order to mount the share from the Debian [Linux development environment on my Chromebook](https://support.google.com/chromebook/answer/9145439), I first needed to install the `davfs2` package to add support for mounting WebDAV shares:

```shell
sudo apt update # [tl! .cmd:1]
sudo apt install davfs2
```

I need to be able mount the share as my standard user account (*without* elevation) to ensure that the ownership and permissions are correctly inherited. The `davfs2` installer offered to enable the SUID bit to support this, but that change on its own doesn't seem to have been sufficient in my testing. In addition (or perhaps instead?), I had to add my account to the `davfs2` group:

```shell
sudo usermod -aG davfs2 $USER # [tl! .cmd]
```

And then use the `newgrp` command to load the new membership without having to log out and back in again:

```shell
newgrp davfs2 # [tl! .cmd]
```

Next I created a folder inside my home directory to use as a mountpoint:

```shell
mkdir ~/taildrive # [tl! .cmd]
```

I knew from the [Taildrive docs](https://tailscale.com/kb/1369/taildrive) that the WebDAV server would be running at `http://100.100.100.100:8080` and the share would be available at `/<tailnet>/<machine>/<share>`, so I added the following to my `/etc/fstab`:

```txt
http://100.100.100.100:8080/example.com/files/share /home/john/taildrive/ davfs user,rw,noauto 0 0
```

Then I ran `sudo systemctl daemon-reload` to make sure the system knew about the changes to the fstab.

Taildrive's WebDAV implementation doesn't require any additional authentication (that's handled automatically by Tailscale), but `davfs2` doesn't know that. So to keep it from prompting unnecessarily for credentials when attempting to mount the taildrive, I added this to the bottom of `~/.davfs2/secrets`, with empty strings taking the place of the username and password:

```txt
/home/john/taildrive "" ""
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

I'd like to eventually get this set up so that [AutoFS](https://help.ubuntu.com/community/Autofs) can handle mounting the Taildrive WebDAV share on the fly. I know that [won't work within the containerized Linux environment on my Chromebook](https://www.chromium.org/chromium-os/developer-library/guides/containers/containers-and-vms/#can-i-mount-filesystems) but I think it *should* be possible on an actual Linux system. My initial efforts were unsuccessful though; I'll update this post if I figure it out.

In the meantime, though, this will be a more convenient way for me to share files between my Tailscale-connected systems.
