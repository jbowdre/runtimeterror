---
title: "Automating Security Camera Notifications With Home Assistant and Ntfy"
date: 2023-11-24
# lastmod: 2023-11-23
draft: true
description: "This is a new post about..."
featured: false
toc: true
comment: true
series: Projects
tags:
  - api
  - automation
  - homeassistant
---
A couple of months ago, I [wrote about](/easy-push-notifications-with-ntfy) how I was using a self-hosted instance of [ntfy](https://ntfy.sh) to help streamline notification pushes from a variety of sources. I closed that post with a quick look at how I had [integrated ntfy into my Home Assistant setup](/easy-push-notifications-with-ntfy/#home-assistant) for some basic notifications.

I've now used that immense power to enhance the notifications I get from the security cameras scattered around my house. I'm using a [Reolink NVR with 8 PoE cameras](https://reolink.com/us/product/rlk16-820d8-a/). I selected Reolink cameras specifically because I knew it was supported by Home Assistant, and for the on-device animal/person/vehicle detection which allowed for a bit of extra control over which types of motion events would trigger a notification or other action. I've been very happy with this choice, but I have found that the Reolink app itself can be a bit clunky:

- The app lets you send notifications on a schedule (I only want notifications from the indoor cameras during work hours when no one is home), but doesn't make it easy to override that schedule (like when it's a holiday and we're all at home anyway).
- Push notifications don't include an image capture so when I receive a notification about a person in my backyard I have to open the app, go select the correct camera, select the Playback option, and scrub back and forth until I see whatever my camera saw.

I figured I could combine the excellent [Reolink integration for Home Assistant](https://www.home-assistant.io/integrations/reolink) with Home Assistant's powerful Automation platform and ntfy to get more informative notifications and more flexible alert schedules. Here's the route I took.

### Alert on motion detection
{{% notice note "Ntfy Integration" %}}
Since manually configuring ntfy in Home Assistant via the [RESTful Notifications integration](easy-push-notifications-with-ntfy/#notify-configuration), I found that a [ntfy-specific integration](https://github.com/ivanmihov/homeassistant-ntfy.sh) was available through the [Home Assistant Community Store](https://hacs.xyz/) addon. That setup is a bit more flexible so I've switched my setup to use it instead:
```yaml
# configuration.yaml
notify:
  - name: ntfy
    platform: rest # [tl! --:8 collapse:8]
    method: POST_JSON
    headers:
      Authorization: !secret ntfy_token
    data:
      topic: home_assistant
    title_param_name: title
    message_param_name: message
    resource: ! secret ntfy_url
    platform: ntfy # [tl! ++:3]
    url: !secret ntfy_url
    token: !secret ntfy_token
    topic: home_assistant
```
{{% /notice %}}

The Reolink integration exposes a number of entities for each camera. For triggering a notification on motion detection, I'll be interested in the [binary sensor](https://www.home-assistant.io/integrations/binary_sensor/) entities named like `binary_sensor.$location_$type` (like `binary_sensor.backyard_person` and `binary_sensor.driveway_vehicle`).

So I'll craft start with a simple automation which will push out a notification whenever any of the listed cameras detect a person (or vehicle):
```yaml
# torchlight! {"lineNumbers": true}
alias: Exterior Motion Alerts
description: ""
trigger:
  - platform: state
    entity_id:
      - binary_sensor.backyard_person
      - binary_sensor.driveway_person
      - binary_sensor.driveway_vehicle
      - binary_sensor.east_side_front_person
      - binary_sensor.east_side_rear_person
      - binary_sensor.west_side_person
    from: "off"
    to: "on"
condition: []
action:
  - service: notify.ntfy
    data:
      title: Motion detected!
      message: "{{ trigger.to_state.attributes.friendly_name }}"
```

{{% notice tip "Templating" %}}
That last line is taking advantage of Jinja templating and [trigger variables](https://www.home-assistant.io/docs/automation/templating/#state) so that the resulting notification displays the friendly name of whichever `binary_sensor` triggered the automation run. This way, I'll see something like "Backyard Person" instead of the entity ID listed earlier.
{{% /notice %}}

### Capture a snapshot
Each Reolink camera also exposes a `camera.$location_sub` entity which represents the video stream from the connected camera. I can add another action to the notification so that it will grab a snapshot, but I'll also need a way to match the `camera` entity to the correct `binary_sensor` entity. I can do that by adding a variable set to the bottom of the automation:

```yaml
# torchlight! {"lineNumbers": true}
alias: Exterior Motion Alerts
description: ""
trigger: # [tl! collapse:start]
  - platform: state
    entity_id:
      - binary_sensor.backyard_person
      - binary_sensor.driveway_person
      - binary_sensor.driveway_vehicle
      - binary_sensor.east_side_front_person
      - binary_sensor.east_side_rear_person
      - binary_sensor.west_side_person
    from: "off"
    to: "on" # [tl! collapse:end]
condition: []
action:
  - service: camera.snapshot # [tl! ++:start focus:start]
    target:
      entity_id: "{{ cameras[trigger.to_state.entity_id] }}"
    data:
      filename: /media/snaps/motion.jpg # [tl! ++:end focus:end]
  - service: notify.ntfy
    data:
      title: Motion detected!
      message: "{{ trigger.to_state.attributes.friendly_name }}"
variables: # [tl! ++:start focus:start]
  cameras:
    binary_sensor.backyard_person: camera.backyard_sub
    binary_sensor.driveway_person: camera.driveway_sub
    binary_sensor.driveway_vehicle: camera.driveway_sub
    binary_sensor.east_side_front_person: camera.east_side_front_sub
    binary_sensor.east_side_rear_person: camera.east_side_rear_sub
    binary_sensor.west_side_person: camera.west_side_sub # [tl! ++:end focus:end]
```

