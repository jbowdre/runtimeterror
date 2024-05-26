---
title: "virtuallypotato -> runtimeterror"
date: 2023-09-13
# lastmod: 2023-09-13
timeless: true
draft: false
description: "This blog has migrated from virtuallypotato.com to runtimeterror.dev."
toc: false
categories: Backstage
tags:
  - meta
---

```shell
cp -a virtuallypotato.com runtimeterror.dev # [tl! .cmd:2]
rm -rf virtuallypotato.com
ln -s virtuallypotato.com runtimeterror.dev
```

If you've noticed that things look a bit different around here, you might *also* have noticed that my posts about VMware products had become less and less frequent over the past year or so. That wasn't intentional, but a side-effect of some shifting priorities with a new position at work. I'm no longer on the team responsible for our VMware environment and am now more focused on cloud-native technologies and open-source DevOps solutions. The new role keeps me pretty busy, and I'm using what free time I have to learn more about and experiment with the technologies I use at work.

That (unfortunately) means that I won't be posting much (if at all) about VMware-related things (including the [vRA8 series of posts](/categories/vmware/))[^vra8] going forward. Instead, expect to see more posts about things like [containers](/tags/containers/), [infrastructure-as-code](/tags/iac/), [self-hosting](/tags/selfhosting/), and [miscellaneous tech projects](/categories/self-hosting/) that I play with.

I decided to migrate, rebrand, and re-theme my blog to reflect this change in focus. virtuallypotato used a [theme heavily inspired by VMware design language](https://github.com/chipzoller/hugo-clarity), and I don't think it's a great fit for the current (and future) content anymore. That theme is also very feature-rich which provides a lot of capability out of the box but makes it a bit tricky to modify (and maintain) my personal tweaks. The new runtimeterror[^pun] site uses a [more minimal theme](https://github.com/joeroe/risotto) which takes cues from terminals and markdown formatting. It's also simpler and thus easier for me to tweak. I've done a lot of that already and anticipating doing a bit more in the coming weeks, but I wanted to go ahead and make this thing "live" for now.

I've copied all content from the old site (including post comments), and set things up so that all existing links should seamlessly redirect. Hopefully that will make for a pretty easy transition, but please add a comment if you see anything that's not quite working right.

Stay buggy.


[^vra8]: I had a lot of cool things I wanted to explore/document with vRA8 and I'm sad that I won't get to "complete" this series. I no longer run a vRA8 instance in my homelab (it's a resource hog and I needed the RAM for other things) though so I don't anticipate revisiting this.

[^pun]: is a pun, and I'm a sucker for puns.