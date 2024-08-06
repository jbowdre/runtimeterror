---
title: "Generate a Dynamic robots.txt File in Hugo with External Data Sources"
date: "2024-08-06T16:59:39Z"
# lastmod: 2024-08-05
description: "Using Hugo resources.GetRemote to fetch a list of bad bots and generate a valid robots.txt at build time."
featured: false
toc: true
reply: true
categories: Backstage
tags:
  - api
  - hugo
  - meta
---
I shared [back in April](/blocking-ai-crawlers/) my approach for generating a `robots.txt` file to <s>block</s> *discourage* AI crawlers from stealing my content. That setup used a static list of known-naughty user agents (derived from the [community-maintained `ai.robots.txt` project](https://github.com/ai-robots-txt/ai.robots.txt)) in my Hugo config file. It's fine (I guess) but it can be hard to keep up with the bad actors - and I'm too lazy to manually update my local copy of the list when things change.

Wouldn't it be great if I could cut out the middle man (me) and have Hugo work straight off of that remote resource? Inspired by [Luke Harris's work](https://www.lkhrs.com/blog/2024/darkvisitors-hugo/) with using Hugo's [`resources.GetRemote` function](https://gohugo.io/functions/resources/getremote/) to build a `robots.txt` from the [Dark Visitors](https://darkvisitors.com/) API, I set out to figure out how to do that for ai.robots.txt.

While I was tinkering with that, [Adam](https://adam.omg.lol/) and [Cory](https://coryd.dev/) were tinkering with a GitHub Actions workflow to streamline the addition of new agents. That repo now uses [a JSON file](https://github.com/ai-robots-txt/ai.robots.txt/blob/main/robots.json) as the Source of Truth for its agent list, and a JSON file available over HTTP looks an *awful* lot like a poor man's API to me.

So here's my updated solution.

As before, I'm taking advantage of Hugo's [robot.txt templating](https://gohugo.io/templates/robots/) to build the file. That requires the following option in my `config/hugo.toml` file:

```toml
enableRobotsTXT = true
```

That tells Hugo to process `layouts/robots.txt`, which I have set up with this content to insert the sitemap and greet robots who aren't assholes:

```text
# torchlight! {"lineNumbers":true}
Sitemap: {{ .Site.BaseURL }}sitemap.xml

# hello robots [^_^]
# let's be friends <3

User-agent: *
Disallow:

# except for these bots which are not friends:

{{ partial "bad-robots.html" . }}
```

I opted to break the heavy lifting out into `layouts/partials/bad-robots.html` to keep things a bit tidier in the main template. This starts out simply enough with using `resources.GetRemote` to fetch the desired JSON file, and printing an error if that doesn't work:

```jinja
# torchlight! {"lineNumbers":true}
{{- $url := "https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/main/robots.json" -}}
{{- with resources.GetRemote $url -}}
	{{- with .Err -}}
		{{- errorf "%s" . -}}
	{{- else -}}
```

The JSON file looks a bit like this, with the user agent strings as the top-level keys:

```json
{
    "Amazonbot": { // [tl! **]
        "operator": "Amazon",
        "respect": "Yes",
        "function": "Service improvement and enabling answers for Alexa users.",
        "frequency": "No information. provided.",
        "description": "Includes references to crawled website when surfacing answers via Alexa; does not clearly outline other uses."
    },
    "anthropic-ai": { // [tl! **]
        "operator": "[Anthropic](https:\/\/www.anthropic.com)",
        "respect": "Unclear at this time.",
        "function": "Scrapes data to train Anthropic's AI products.",
        "frequency": "No information. provided.",
        "description": "Scrapes data to train LLMs and AI products offered by Anthropic."
    },
    "Applebot-Extended": { // [tl! **]
        "operator": "[Apple](https:\/\/support.apple.com\/en-us\/119829#datausage)",
        "respect": "Yes",
        "function": "Powers features in Siri, Spotlight, Safari, Apple Intelligence, and others.",
        "frequency": "Unclear at this time.",
        "description": "Apple has a secondary user agent, Applebot-Extended ... [that is] used to train Apple's foundation models powering generative AI features across Apple products, including Apple Intelligence, Services, and Developer Tools."
    },
    {...}
}
```

There's quite a bit more detail in this JSON than I really care about; all I need for this are the bot names. So I unmarshal the JSON data, iterate through the top-level keys to extract the names, and print a line starting with `User-agent: ` followed by the name for each bot.

```jinja
# torchlight! {"lineNumbers":true, "lineNumbersStart":6}
    {{- $robots := unmarshal .Content -}}
    {{- range $botname, $_ := $robots }}
      {{- printf "User-agent: %s\n" $botname }}
    {{- end }}
```

And once the loop is finished, I print the important `Disallow: /` rule (and a plug for the repo) and clean up:

```jinja
# torchlight! {"lineNumbers":true, "lineNumbersStart":10}
    {{- printf "Disallow: /\n" }}
    {{- printf "\n# (bad bots bundled by https://github.com/ai-robots-txt/ai.robots.txt)" }}
	{{- end -}}
{{- else -}}
	{{- errorf "Unable to get remote resource %q" $url -}}
{{- end -}}
```

So here's the completed `layouts/partials/bad-robots.html`:

```jinja
# torchlight! {"lineNumbers":true}
{{- $url := "https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/main/robots.json" -}}
{{- with resources.GetRemote $url -}}
	{{- with .Err -}}
		{{- errorf "%s" . -}}
	{{- else -}}
    {{- $robots := unmarshal .Content -}}
    {{- range $botname, $_ := $robots }}
      {{- printf "User-agent: %s\n" $botname }}
    {{- end }}
    {{- printf "Disallow: /\n" }}
    {{- printf "\n# (bad bots bundled by https://github.com/ai-robots-txt/ai.robots.txt)" }}
	{{- end -}}
{{- else -}}
	{{- errorf "Unable to get remote resource %q" $url -}}
{{- end -}}
```

After that's in place, I can fire off a quick `hugo server` in the shell and check out my work at `http://localhost:1313/robots.txt`:

```text
Sitemap: http://localhost:1313/sitemap.xml

# hello robots [^_^]
# let's be friends <3

User-agent: *
Disallow:

# except for these bots which are not friends:

User-agent: Amazonbot
User-agent: Applebot-Extended
User-agent: Bytespider
User-agent: CCBot
User-agent: ChatGPT-User
User-agent: Claude-Web
User-agent: ClaudeBot
User-agent: Diffbot
User-agent: FacebookBot
User-agent: FriendlyCrawler
User-agent: GPTBot
User-agent: Google-Extended
User-agent: GoogleOther
User-agent: GoogleOther-Image
User-agent: GoogleOther-Video
User-agent: ICC-Crawler
User-agent: ImageSift
User-agent: Meta-ExternalAgent
User-agent: OAI-SearchBot
User-agent: PerplexityBot
User-agent: PetalBot
User-agent: Scrapy
User-agent: Timpibot
User-agent: VelenPublicWebCrawler
User-agent: YouBot
User-agent: anthropic-ai
User-agent: cohere-ai
User-agent: facebookexternalhit
User-agent: img2dataset
User-agent: omgili
User-agent: omgilibot
Disallow: /

# (bad bots bundled by https://github.com/ai-robots-txt/ai.robots.txt)
```

Neat!

### Next Steps

Of course, bad agents being disallowed in a `robots.txt` doesn't really accomplish anything if they're [just going to ignore that and scrape my content anyway](https://rknight.me/blog/perplexity-ai-robotstxt-and-other-questions/). I closed my [last post](/blocking-ai-crawlers/) on the subject with a bit about the Cloudflare WAF rule I had created to actively block these known bad actors. Since then, two things have changed:

First, Cloudflare rolled out an even easier way to [block bad bots with a single click](https://blog.cloudflare.com/declaring-your-aindependence-block-ai-bots-scrapers-and-crawlers-with-a-single-click). If you're using Cloudflare, just enable that and call it day.

Second, this site is [now hosted (and fronted) by Bunny](/further-down-the-bunny-hole/) so the Cloudflare solutions won't help me anymore.

Instead, I've been using [Melanie's handy script](https://paste.melanie.lol/bunny-ai-blocking.js) to create a Bunny edge rule (similar to the Cloudflare WAF rule) to handle the blocking.

Going forward, I think I'd like to explore using [Bunny's new Terraform provider](https://registry.terraform.io/providers/BunnyWay/bunnynet/latest/docs) to manage the [edge rule](https://registry.terraform.io/providers/BunnyWay/bunnynet/latest/docs/resources/pullzone_edgerule) in a more stateful way. But that's a topic for another post!
