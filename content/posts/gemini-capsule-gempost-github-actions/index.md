---
title: "Self-Hosted Gemini Capsule with Gempost and GitHub Actions"
date: 2024-03-15
# lastmod: 2024-03-15
draft: true
description: "This is a new post about..."
featured: false
toc: true
comments: true
categories: Self-Hosting
tags:
  - caddy
  - cicd
  - docker
  - selfhosting
---
I've recently been exploring some indieweb/smolweb technologies, and one of the most interesting things I've come across is [Project Gemini](https://geminiprotocol.net/):

> Gemini is a new internet technology supporting an electronic library of interconnected text documents. That's not a new idea, but it's not old fashioned either. It's timeless, and deserves tools which treat it as a first class concept, not a vestigial corner case. Gemini isn't about innovation or disruption, it's about providing some respite for those who feel the internet has been disrupted enough already. We're not out to change the world or destroy other technologies. We are out to build a lightweight online space where documents are just documents, in the interests of every reader's privacy, attention and bandwidth.

I thought it was an interesting idea, so after a bit of experimentation with various hosted options I created a self-hosted [Gemini Capsule (Gemini for "web site") to host a lightweight text-focused Gemlog ("weblog")](https://capsule.jbowdre.lol/gemlog/2024-03-05-hello-gemini.gmi). After further tinkering, I arranged to serve the Capsule both on the Gemini network as well as the traditional HTTP-based web, and I set up a GitHub Actions workflow to handle posting updates. This post will describe how I did that.

### Gemini Server
There are a number of different [Gemini server applications](https://github.com/kr1sp1n/awesome-gemini?tab=readme-ov-file#servers) to choose from. I decided to use [Agate](https://github.com/mbrubeck/agate), not just because it was at the top of the Awesome Gemini list but also because seems to be widely recommended and regularly updated.

I wasn't able to find a pre-built Docker image for Agate (at least not one which had been updated within the past year or so), but I found that I could easily make my own by just installing Agate on top of the standard Rust image. So I came up with this `Dockerfile`:

```Dockerfile
# torchlight! {"lineNumbers": true}
FROM rust:latest

RUN cargo install agate

WORKDIR /var/agate

ENTRYPOINT ["agate"]
```

This very simply uses the [Rust package manager](https://doc.rust-lang.org/cargo/) to install `agate`, change to an appropriate working directory, and start the `agate` executable.

And then I can set up a basic `docker-compose.yaml` for it:

```yaml
# torchlight! {"lineNumbers": true}
version: "3.9"
services:
  agate:
    restart: always
    build: .
    container_name: agate
    volumes:
      - ./content:/var/agate/content
      - ./certs:/var/agate/certs
    ports:
      - "1965:1965"
    command: --content content --certs certs --addr 0.0.0.0:1965 --hostname capsule.jbowdre.lol --lang en-US
```




