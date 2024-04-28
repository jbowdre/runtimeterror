---
title: "Configuring a Custom Font in Hugo"
date: 2024-04-23
# lastmod: 2024-04-23
draft: true
description: "This is a new post about..."
featured: false
toc: true
comments: true
categories: Tips # Backstage, ChromeOS, Code, Self-Hosting, VMware
tags:
  - bunny
  - cloudflare
  - hugo
  - meta
  - tailscale
---
Last week, I came across and immediately fell in love with a delightfully-retro monospace font called [Berkeley Mono](https://berkeleygraphics.com/typefaces/berkeley-mono/). I promptly purchased a "personal developer" license and set to work [applying the font in my IDE and terminal](https://scribbles.jbowdre.lol/post/trying-tabby-terminal). I didn't want to stop there, though; the license also permits me to use the font on my personal site, and Berkeley Mono will fit in beautifully with the whole runtimeterror aesthetic.

Long story short, you're looking at a slick new font here. Long story long: I'm about to tell you how I added the font both to the site and to the [dynamically-generated OpenGraph share images](/dynamic-opengraph-images-with-hugo/) setup. It wasn't terribly hard to implement, but the Hugo documentation is a bit light on how to do it (and I'm kind of inept at this whole web development thing).

### Web Font
The [risotto theme for Hugo](https://github.com/joeroe/risotto/tree/main) upon which this site is based defines the default font face(s) as the variable `--font-monospace` in `themes/risotto/static/css/typography.css`, and then that variable is inserted wherever the font may need to be set:

```css
/* torchlight! {"lineNumbers":true} */
/* Fonts */
:root {
    --font-monospace: "Fira Mono", monospace; /* [tl! **] */
}

body {
    font-family: var(--font-monospace); /* [tl! **] */
    font-size: 16px;
    line-height: 1.5rem;
}
```

This makes it easy to override the theme's font by referencing my preferred font in `static/custom.css`:

```css
/* font overrides */
:root {
  --font-monospace: 'Berkeley Mono', 'Fira Mono', monospace; /* [tl! **] */
}
```

And that would be the end of things if I could expect that everyone who visited my site already had the Berkeley Mono font installed; if they don't, though, the site will fallback to either the Fira Mono font or whatever generic monospace font is on the system. So maybe I'll add a few other monospace fonts just for good measure:

```css
/* font overrides */
:root {
  --font-monospace: 'Berkeley Mono', 'IBM Plex Mono', 'Cascadia Mono', 'Roboto Mono', 'Source Code Pro', 'Fira Mono', 'Courier New', monospace; /* [tl! **] */
}
```

That gives me a few more fallback fonts to fall back to if my preferred font isn't available. But let's see about making that font available.

#### Hosted Locally
I can use a `@font-face` rule to tell the browser how to find the `.woff2`/`.woff` files for my preferred web font, and I could just set the `src: url` parameter to point to a local path in my Hugo environment:

```css
/* load preferred font */
@font-face {
  font-family: 'Berkeley Mono';
  font-style: normal;
  font-weight: 400;
  src: local('Berkeley Mono'),
    url('/fonts/BerkeleyMono.woff2') format('woff2'),
    url('/fonts/BerkeleyMono.woff') format('woff')
}
```

And that would work just fine... but it *would* require storing those web font files in the GitHub repo which powers my site, and I'd rather not host any paid font files in such a way.

So instead, I opted to store the web font files in a CDN, where I could exercise some degree of access control, learn more about a web technology I haven't played with a whole lot, and make use of a cool `cdn.runtimeterror.dev` subdomain in the process.

{{% notice note "Double the CDN, double the fun" %}}
Of course, while writing this post I gave in to my impulsive nature and [migrated the site from Cloudflare to Bunny.net](https://scribbles.jbowdre.lol/post/i-just-hopped-to-bunny-net). So I'm going to briefly describe how I set this up first on [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) and later on [Bunny Storage](https://bunny.net/storage/).
{{% /notice %}}

#### Cloudflare R2
Getting started with R2 was really easy; I just [created a new R2 bucket](https://developers.cloudflare.com/r2/buckets/create-buckets/) called `runtimeterror` and [connected it to the custom domain](https://developers.cloudflare.com/r2/buckets/public-buckets/#connect-a-bucket-to-a-custom-domain) `cdn.runtimeterror.dev`. I put the two web font files in a folder titled `fonts` and uploaded them to the bucket so that they can be accessed under `https://cdn.runtimeterror.dev/fonts/`.

I could then employ a [Cross-Origin Resource Sharing (CORS)](https://developers.cloudflare.com/r2/buckets/cors/) policy to ensure the fonts hosted on my fledgling CDN can only be loaded on my site. I configured the policy to also allow access from my `localhost` Hugo build environment as well as a preview Neocities environment I use for testing such major changes:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:1313",
      "https://secret--runtimeterror--preview.neocities.org",
      "https://runtimeterror.dev"
    ],
    "AllowedMethods": [
      "GET"
    ]
  }
]
```

Then I just needed to update the `@font-face` rule accordingly:

```css
/* load preferred font */
@font-face {
  font-family: 'Berkeley Mono';
  font-style: normal;
  font-weight: 400;
  font-display: fallback; /* [tl! ++] */
  src: local('Berkeley Mono'),
    url('/fonts/BerkeleyMono.woff2') format('woff2'), /* [tl! --] */
    url('https://cdn.runtimeterror.dev/fonts/BerkeleyMono.woff2') format('woff2'), /* [tl! ++] */
    url('/fonts/BerkeleyMono.woff') format('woff') /* [tl! --] */
    url('https://cdn.runtimeterror.dev/fonts/BerkeleyMono.woff') format('woff') /* [tl! ++] */
}
```

I added in the `font-display: fallback;` descriptor to address the fact that the site will now be loading a remote font. Rather than blocking and not rendering text until the preferred font is loaded, it will show text in one of the available fallback fonts. If the preferred font loads quickly enough, it will be swapped in; otherwise, it will just show up on the next page load. I figured this was a good middle-ground between wanting the site to load quickly while also looking the way I want it to.

To test my work, I ran `hugo server` to build and serve the site locally on `http://localhost:1313`... and promptly encountered a cascade of CORS-related errors. I kept tweaking the policy and trying to learn more about what I'm doing (reminder: I'm bad at this), but just couldn't figure out what was preventing the font from being loaded.

I *eventually* discovered that sometimes you need to clear Cloudflare's cache so that new policy changes will take immediate effect. Once I [purged everything](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-everything/), the errors went away and the font loaded successfully.

### Bunny Storage
After migrating my domain to Bunny.net, the CDN font setup was pretty similar - but also different enough that it's worth mentioning. I started by creating a new Storage Zone named `runtimeterror-storage`, and selecting an appropriate-seeming set of replication regions. I then uploaded the same `fonts/` folder as before.

To be able to access the files in Bunny Storage, I then connected a new Pull Zone (called `runtimeterror-pull`) and linked that Pull Zone with the `cdn.runtimeterror.dev` hostname. I also made sure to enable the option to automatically generate a certificate for this host.

Rather than needing me to understand CORS and craft a viable policy file, Bunny provides a clean UI with easy-to-understand options for configuring the pull zone security. I enabled the options to block root path access, block `POST` requests, and block direct file access, and also added the same trusted referrers as before:

![Bunny CDN security configuration](bunny-cdn-security.png)

I made sure to use the same paths as I had on Cloudflare so I didn't need to update the Hugo config at all even after changing CDNs. That same CSS from before still works:

```css
/* load preferred font */
@font-face {
  font-family: 'Berkeley Mono';
  font-style: normal;
  font-weight: 400;
  font-display: fallback;
  src: local('Berkeley Mono'),
    url('https://cdn.runtimeterror.dev/fonts/BerkeleyMono.woff2') format('woff2'),
    url('https://cdn.runtimeterror.dev/fonts/BerkeleyMono.woff') format('woff')
}
```

So that's the web font for the web site sorted (twice); now let's tackle the font in the OpenGraph share images.

### Image Filter Text
My [setup for generating the share images](/dynamic-opengraph-images-with-hugo/) leverages the Hugo [images.Text](https://gohugo.io/functions/images/text/) function to overlay text onto a background image, and it needs a TrueType font in order to work. I was previously just storing the required font directly in my GitHub repo so that it would be available during the site build, but I definitely don't want to do that with a paid font file. So I needed to come up with some way to provide the TTF file to the builder without making it publicly available.

I recently figured out how I could [use a GitHub Action to easily connect the builder to my Tailscale environment](/gemini-capsule-gempost-github-actions/#publish-github-actions:~:text=name%3A%20Connect%20to%20Tailscale), and I figured I could re-use that idea here - only instead of pushing something to my tailnet, I'll need to pull something out.

#### Tailscale Setup
So I SSH'd to the cloud server I'm already using for hosting my Gemini capsule, created a folder to hold the font file (`/opt/fonts/`), and copied the TTF file into there. And then I used [Tailscale Serve](/tailscale-ssh-serve-funnel/#tailscale-serve) to publish that folder internally to my tailnet:

```shell
sudo tailscale serve --bg --set-path /fonts /opt/fonts/ # [tl! .cmd]
# [tl! .nocopy:4]
Available within your tailnet:

https://node.tailnet-name.ts.net/fonts/
|-- path  /opt/fonts
```

Last time, I set up the Tailscale ACL so that the GitHub Runner (`tag:gh-bld`) could talk to my server (`tag:gh-srv`) over SSH:

```json
  "acls": [
    {
      // github runner can talk to the deployment target
      "action": "accept",
      "users":  ["tag:gh-bld"],
      "ports": [
        "tag:gh-srv:22"
      ],
    }
  ],
```

I needed to update that ACL to allow communication over HTTPS as well:

```json
  "acls": [
    {
      // github runner can talk to the deployment target
      "action": "accept",
      "users":  ["tag:gh-bld"],
      "ports": [
        "tag:gh-srv:22",
        "tag:gh-srv:443" // [tl! ++]
      ],
    }
  ],
```

I then logged into the Tailscale admin panel to follow the same steps as last time to generate a unique [OAuth client](https://tailscale.com/kb/1215/oauth-clients) tied to the `tag:gh-bld` tag. I stored the ID, secret, and tags as repository secrets named `TS_API_CLIENT_ID`, `TS_API_CLIENT_SECRET`, and `TS_TAG`.

I also created a `REMOTE_FONT_PATH` secret which will be used to tell Hugo where to find the required TTF file (`https://node.tailnet-name.ts.net/fonts/BerkeleyMono.ttf`).

#### Hugo Setup
Here's the image-related code that I was previously using in `layouts/partials/opengraph` to create the OpenGraph images:

```jinja-html
{{ $img := resources.Get "og_base.png" }}
{{ $font := resources.Get "/FiraMono-Regular.ttf" }}
{{ $text := "" }}

{{- if .IsHome }}
  {{ $text = .Site.Params.Description }}
{{- end }}

{{- if .IsPage }}
  {{ $text = .Page.Title }}
{{ end }}

{{- with .Params.thumbnail }}
  {{ $thumbnail := $.Resources.Get . }}
  {{ with $thumbnail }}
    {{ $img = $img.Filter (images.Overlay (.Process "fit 300x250") 875 38 )}}
  {{ end }}
{{ end }}

{{ $img = $img.Filter (images.Text $text (dict
  "color" "#d8d8d8"
  "size" 64
  "linespacing" 2
  "x" 40
  "y" 300
  "font" $font
))}}
{{ $img = resources.Copy (path.Join $.Page.RelPermalink "og.png") $img }}
```

All I need to do is get it to pull the font resource from a web address rather than the local file system, and I'll do that by loading an environment variable instead of hardcoding the path here:

```jinja-html
{{ $img := resources.Get "og_base.png" }}
{{ $font := resources.Get "/FiraMono-Regular.ttf" }} <!-- [tl! -- ] -->
{{ $text := "" }}
{{ $font := "" }} <!-- [tl! ++:10 **:10 ]>
{{ $path := os.Getenv "HUGO_REMOTE_FONT_PATH" }}
{{ with resources.GetRemote $path }}
  {{ with .Err }}
    {{ errorf "%s" . }}
  {{ else }}
    {{ $font = . }}
  {{ end }}
{{ else }}
  {{ errorf "Unable to get resource %q" $path }}
{{ end }}

{{- if .IsHome }}
  {{ $text = .Site.Params.Description }}
{{- end }}

<!-- [tl! collapse:start ] -->
{{- if .IsPage }}
  {{ $text = .Page.Title }}
{{ end }}

{{- with .Params.thumbnail }}
  {{ $thumbnail := $.Resources.Get . }}
  {{ with $thumbnail }}
    {{ $img = $img.Filter (images.Overlay (.Process "fit 300x250") 875 38 )}}
  {{ end }}
{{ end }}

{{ $img = $img.Filter (images.Text $text (dict
  "color" "#d8d8d8"
  "size" 64
  "linespacing" 2
  "x" 40
  "y" 300
  "font" $font
))}}
{{ $img = resources.Copy (path.Join $.Page.RelPermalink "og.png") $img }} <!-- [tl! collapse:end ] -->
```

#### GitHub Action
All that's left is to update the GitHub Action to handle the build for me.