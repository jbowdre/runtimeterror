---
title: "Blocking AI Crawlers"
date: 2024-04-12
lastmod: "2024-04-14T02:21:57Z"
description: "Using Hugo to politely ask AI bots to not steal my content - and then configuring Cloudflare's WAF to actively block them, just to be sure."
featured: false
toc: true
comments: true
categories: Backstage
tags:
  - cloud
  - cloudflare
  - hugo
  - meta
  - selfhosting
---
I've seen some recent posts from folks like [Cory Dransfeldt](https://coryd.dev/posts/2024/go-ahead-and-block-ai-web-crawlers/) and [Ethan Marcotte](https://ethanmarcotte.com/wrote/blockin-bots/) about how (and *why*) to prevent your personal website from being slurped up by the crawlers that AI companies use to [actively enshittify the internet](https://boehs.org/node/llms-destroying-internet). I figured it was past time for me to hop on board with this, so here we are.

My initial approach was to use [Hugo's robots.txt templating](https://gohugo.io/templates/robots/) to generate a `robots.txt` file based on a list of bad bots I got from [ai.robots.txt on GitHub](https://github.com/ai-robots-txt/ai.robots.txt).

I dumped that list into my `config/params.toml` file, *above* any of the nested elements (since toml is kind of picky about that...).

```toml
robots = [
  "AdsBot-Google",
  "Amazonbot",
  "anthropic-ai",
  "Applebot",
  "AwarioRssBot",
  "AwarioSmartBot",
  "Bytespider",
  "CCBot",
  "ChatGPT",
  "ChatGPT-User",
  "Claude-Web",
  "ClaudeBot",
  "cohere-ai",
  "DataForSeoBot",
  "Diffbot",
  "FacebookBot",
  "Google-Extended",
  "GPTBot",
  "ImagesiftBot",
  "magpie-crawler",
  "omgili",
  "Omgilibot",
  "peer39_crawler",
  "PerplexityBot",
  "YouBot"
]

[author]
name = "John Bowdre"
```

I then created a new template in `layouts/robots.txt`:

```text
Sitemap: {{ .Site.BaseURL }}/sitemap.xml

User-agent: *
Disallow:
{{ range .Site.Params.robots }}
User-agent: {{ . }}
{{- end }}
Disallow: /
```

And enabled the template processing for this in my `config/hugo.toml` file:

```toml
enableRobotsTXT = true
```

Now Hugo will generate the following `robots.txt` file for me:

```text
Sitemap: https://runtimeterror.dev//sitemap.xml

User-agent: *
Disallow:

User-agent: AdsBot-Google
User-agent: Amazonbot
User-agent: anthropic-ai
User-agent: Applebot
User-agent: AwarioRssBot
User-agent: AwarioSmartBot
User-agent: Bytespider
User-agent: CCBot
User-agent: ChatGPT
User-agent: ChatGPT-User
User-agent: Claude-Web
User-agent: ClaudeBot
User-agent: cohere-ai
User-agent: DataForSeoBot
User-agent: Diffbot
User-agent: FacebookBot
User-agent: Google-Extended
User-agent: GPTBot
User-agent: ImagesiftBot
User-agent: magpie-crawler
User-agent: omgili
User-agent: Omgilibot
User-agent: peer39_crawler
User-agent: PerplexityBot
User-agent: YouBot
Disallow: /
```

Cool!

I also dropped the following into `static/ai.txt` for [good measure](https://site.spawning.ai/spawning-ai-txt):

```text
# Spawning AI
# Prevent datasets from using the following file types

User-Agent: *
Disallow: /
Disallow: *
```

That's all well and good, but these files carry all the weight and authority of a "No Soliciting" sign. Do I *really* trust these bots to honor it?

I'm hosting this site [on Neocities](/deploy-hugo-neocities-github-actions/), and Neocities unfortunately (though perhaps wisely) doesn't give me control of the web server there. But the site is fronted by Cloudflare, and that does give me a lot of options for blocking stuff I don't want.

So I added a [WAF Custom Rule](https://developers.cloudflare.com/waf/custom-rules/) to block those unwanted bots. (I could have used their [User Agent Blocking](https://developers.cloudflare.com/waf/tools/user-agent-blocking) to accomplish the same, but you can only set 10 of those on the free tier. I can put all the user agents together in a single WAF Custom Rule.)

Here's the expression I'm using:

```text
(http.user_agent contains "AdsBot-Google") or (http.user_agent contains "Amazonbot") or (http.user_agent contains "anthropic-ai") or (http.user_agent contains "Applebot") or (http.user_agent contains "AwarioRssBot") or (http.user_agent contains "AwarioSmartBot") or (http.user_agent contains "Bytespider") or (http.user_agent contains "CCBot") or (http.user_agent contains "ChatGPT-User") or (http.user_agent contains "ClaudeBot") or (http.user_agent contains "Claude-Web") or (http.user_agent contains "cohere-ai") or (http.user_agent contains "DataForSeoBot") or (http.user_agent contains "FacebookBot") or (http.user_agent contains "Google-Extended") or (http.user_agent contains "GoogleOther") or (http.user_agent contains "GPTBot") or (http.user_agent contains "ImagesiftBot") or (http.user_agent contains "magpie-crawler") or (http.user_agent contains "Meltwater") or (http.user_agent contains "omgili") or (http.user_agent contains "omgilibot") or (http.user_agent contains "peer39_crawler") or (http.user_agent contains "peer39_crawler/1.0") or (http.user_agent contains "PerplexityBot") or (http.user_agent contains "Seekr") or (http.user_agent contains "YouBot")
```

![Creating a custom WAF rule in Cloudflare's web UI](cloudflare-waf-rule.png)

And checking on that rule ~24 hours later, I can see that it's doing some good:

![It's blocked 102 bot hits already](cloudflare-waf-status.png)

See ya, AI bots!