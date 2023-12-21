---
title: "Quick Salt State to Deploy Netdata"
date: 2023-12-21
# lastmod: 2023-12-21
draft: true
description: "A hasty Salt state to deploy netdata monitoring and publish it internally on my tailnet with Tailscale Serve"
featured: false
toc: true
comment: true
series: Scripts
tags:
  - homelab
  - iac
  - linux
  - salt
  - tailscale
---
As a follow-up to my [recent explorations](/tailscale-ssh-serve-funnel) with using Tailscale Serve to make [netdata](https://github.com/netdata/netdata) monitoring readily available on my [tailnet](https://tailscale.com/kb/1136/tailnet), I wanted a quick way to reproduce that configuration across my handful of systems. These systems already have [Tailscale installed](https://tailscale.com/download/linux) and configured, and they're all [managed with Salt](https://docs.saltproject.io/en/getstarted/).

So here's a hasty Salt state that I used to make it happen.

It simply installs netdata using the [handy-dandy kickstart script](https://learn.netdata.cloud/docs/installing/one-line-installer-for-all-linux-systems), and then configures Tailscale to Serve the netdata instance (with a trusted cert!) inside my tailnet over `https://[hostname].[tailnet-name].ts.net:8443/netdata`.


```yaml
# torchlight! {"lineNumbers": true}
# -*- coding: utf-8 -*-
# vim: ft=sls
# Hasty Salt config to install Netdata and make it available within a Tailscale tailnet
# at https://[hostname].[tailnet-name].ts.net:8443/netdata

curl:
  pkg.installed

tailscale:
  pkg.installed:
    - version: latest

netdata-kickstart:
  cmd.run:
    - name: curl -Ss https://my-netdata.io/kickstart.sh | sh -s -- --dont-wait
    - require:
      - pkg: curl
    # don't run this block if netdata is already running
    - unless: pgrep netdata

tailscale-serve:
  cmd.run:
    - name: tailscale serve --bg --https 8443 --set-path /netdata 19999
    - require:
      - pkg: tailscale
      - cmd: netdata-kickstart
    # don't run this if netdata is already tailscale-served
    - unless: tailscale serve status | grep -q '/netdata proxy http://127.0.0.1:19999'
```

It's not super elegant... but it got the job done, and that's all I needed it to do.

```shell
sudo salt 'minion-name' state.apply netdata # [tl! .cmd focus]
minion-name: # [tl! .nocopy:start collapse:start]
----------
          ID: curl
    Function: pkg.installed
      Result: True
     Comment: All specified packages are already installed
     Started: 22:59:00.821329
    Duration: 28.639 ms
     Changes:
----------
          ID: tailscale
    Function: pkg.installed
      Result: True
     Comment: All specified packages are already installed and are at the desired version
     Started: 22:59:00.850083
    Duration: 4589.765 ms
     Changes:
----------
          ID: netdata-kickstart
    Function: cmd.run
        Name: curl -Ss https://my-netdata.io/kickstart.sh | sh -s -- --dont-wait
      Result: True
     Comment: Command "curl -Ss https://my-netdata.io/kickstart.sh | sh -s -- --dont-wait" run
     Started: 22:59:05.441217
    Duration: 10617.082 ms
     Changes:
              ----------
              pid:
                  169287
              retcode:
                  0
              stderr:
                  sh: 19: cd: can't cd to sh
                   --- Using /tmp/netdata-kickstart-ZtqZcfWuqk as a temporary directory. ---
                   --- Checking for existing installations of Netdata... ---
                   --- No existing installations of netdata found, assuming this is a fresh install. ---
                   --- Attempting to install using native packages... ---
                   --- Repository configuration is already present, attempting to install netdata. ---
                  [/tmp/netdata-kickstart-ZtqZcfWuqk]# env DEBIAN_FRONTEND=noninteractive apt-get -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold install -y netdata
                   OK

                  [/tmp/netdata-kickstart-ZtqZcfWuqk]# test -x //usr/libexec/netdata/netdata-updater.sh
                   OK

                  [/tmp/netdata-kickstart-ZtqZcfWuqk]# grep -q \-\-enable-auto-updates //usr/libexec/netdata/netdata-updater.sh
                   OK

                  [/tmp/netdata-kickstart-ZtqZcfWuqk]# //usr/libexec/netdata/netdata-updater.sh --enable-auto-updates
                  Thu Dec 21 22:59:15 UTC 2023 : INFO: netdata-updater.sh:  Auto-updating has been ENABLED through cron, updater script linked to /etc/cron.daily/netdata-updater

                  Thu Dec 21 22:59:15 UTC 2023 : INFO: netdata-updater.sh:  If the update process fails and you have email notifications set up correctly for cron on this system, you should receive an email notification of the failure.
                  Thu Dec 21 22:59:15 UTC 2023 : INFO: netdata-updater.sh:  Successful updates will not send an email.
                   OK

                  Successfully installed the Netdata Agent.

                  Official documentation can be found online at https://learn.netdata.cloud/docs/.

                  Looking to monitor all of your infrastructure with Netdata? Check out Netdata Cloud at https://app.netdata.cloud.

                  Join our community and connect with us on:
                    - GitHub: https://github.com/netdata/netdata/discussions
                    - Discord: https://discord.gg/5ygS846fR6
                    - Our community forums: https://community.netdata.cloud/
                  [/tmp/netdata-kickstart-ZtqZcfWuqk]# rm -rf /tmp/netdata-kickstart-ZtqZcfWuqk
                   OK
              stdout:
                  Reading package lists...
                  Building dependency tree...
                  Reading state information...
                  The following packages were automatically installed and are no longer required:
                    libnorm1 libpgm-5.2-0 libxmlb1 libzmq5 python3-contextvars python3-croniter
                    python3-dateutil python3-gnupg python3-immutables python3-jmespath
                    python3-msgpack python3-psutil python3-pycryptodome python3-tz python3-zmq
                  Use 'apt autoremove' to remove them.
                  The following additional packages will be installed:
                    netdata-ebpf-code-legacy netdata-plugin-apps netdata-plugin-chartsd
                    netdata-plugin-debugfs netdata-plugin-ebpf netdata-plugin-go
                    netdata-plugin-logs-management netdata-plugin-nfacct netdata-plugin-perf
                    netdata-plugin-pythond netdata-plugin-slabinfo
                    netdata-plugin-systemd-journal
                  Suggested packages:
                    netdata-plugin-cups netdata-plugin-freeipmi apcupsd nut nvme-cli
                  The following NEW packages will be installed:
                    netdata netdata-ebpf-code-legacy netdata-plugin-apps netdata-plugin-chartsd
                    netdata-plugin-debugfs netdata-plugin-ebpf netdata-plugin-go
                    netdata-plugin-logs-management netdata-plugin-nfacct netdata-plugin-perf
                    netdata-plugin-pythond netdata-plugin-slabinfo
                    netdata-plugin-systemd-journal
                  0 upgraded, 13 newly installed, 0 to remove and 11 not upgraded.
                  Need to get 0 B/30.7 MB of archives.
                  After this operation, 154 MB of additional disk space will be used.
                  Selecting previously unselected package netdata-ebpf-code-legacy.
                  (Reading database ...
                  (Reading database ... 5%
                  (Reading database ... 10%
                  (Reading database ... 15%
                  (Reading database ... 20%
                  (Reading database ... 25%
                  (Reading database ... 30%
                  (Reading database ... 35%
                  (Reading database ... 40%
                  (Reading database ... 45%
                  (Reading database ... 50%
                  (Reading database ... 55%
                  (Reading database ... 60%
                  (Reading database ... 65%
                  (Reading database ... 70%
                  (Reading database ... 75%
                  (Reading database ... 80%
                  (Reading database ... 85%
                  (Reading database ... 90%
                  (Reading database ... 95%
                  (Reading database ... 100%
                  (Reading database ... 118906 files and directories currently installed.)
                  Preparing to unpack .../00-netdata-ebpf-code-legacy_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-ebpf-code-legacy (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-ebpf.
                  Preparing to unpack .../01-netdata-plugin-ebpf_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-plugin-ebpf (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-apps.
                  Preparing to unpack .../02-netdata-plugin-apps_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-plugin-apps (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-pythond.
                  Preparing to unpack .../03-netdata-plugin-pythond_1.44.0-77-nightly_all.deb ...
                  Unpacking netdata-plugin-pythond (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-go.
                  Preparing to unpack .../04-netdata-plugin-go_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-plugin-go (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-debugfs.
                  Preparing to unpack .../05-netdata-plugin-debugfs_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-plugin-debugfs (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-nfacct.
                  Preparing to unpack .../06-netdata-plugin-nfacct_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-plugin-nfacct (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-chartsd.
                  Preparing to unpack .../07-netdata-plugin-chartsd_1.44.0-77-nightly_all.deb ...
                  Unpacking netdata-plugin-chartsd (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-slabinfo.
                  Preparing to unpack .../08-netdata-plugin-slabinfo_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-plugin-slabinfo (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-perf.
                  Preparing to unpack .../09-netdata-plugin-perf_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-plugin-perf (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata.
                  Preparing to unpack .../10-netdata_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-logs-management.
                  Preparing to unpack .../11-netdata-plugin-logs-management_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-plugin-logs-management (1.44.0-77-nightly) ...
                  Selecting previously unselected package netdata-plugin-systemd-journal.
                  Preparing to unpack .../12-netdata-plugin-systemd-journal_1.44.0-77-nightly_amd64.deb ...
                  Unpacking netdata-plugin-systemd-journal (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-nfacct (1.44.0-77-nightly) ...
                  Setting up netdata (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-pythond (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-systemd-journal (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-debugfs (1.44.0-77-nightly) ...
                  Setting up netdata-ebpf-code-legacy (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-perf (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-chartsd (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-ebpf (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-apps (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-logs-management (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-go (1.44.0-77-nightly) ...
                  Setting up netdata-plugin-slabinfo (1.44.0-77-nightly) ...
                  Processing triggers for systemd (245.4-4ubuntu3.22) ...
----------
          ID: tailscale-serve
    Function: cmd.run
        Name: tailscale serve --bg --https 8443 --set-path /netdata 19999
      Result: True
     Comment: Command "tailscale serve --bg --https 8443 --set-path /netdata 19999" run
     Started: 22:59:16.060397
    Duration: 62.624 ms
     Changes: ' # [tl! collapse:end]
              ----------
              pid:
                  170328
              retcode:
                  0
              stderr:
              stdout:
                  Available within your tailnet: # [tl! focus:start]

                  https://minion-name.tailnet-name.ts.net:8443/netdata
                  |-- proxy http://127.0.0.1:19999

                  Serve started and running in the background.
                  To disable the proxy, run: tailscale serve --https=8443 off

Summary for minion-name
------------
Succeeded: 4 (changed=2) # [tl! highlight]
Failed:    0
------------
Total states run:     4
Total run time:  15.298 s
# [tl! .nocopy:end focus:end]
```
