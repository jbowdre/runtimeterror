---
title: "Dynamic Opengraph Images With Hugo"
date: 2024-02-18
# lastmod: 2024-02-18
draft: true
description: "This is a new post about..."
featured: false
toc: true
comments: true
thumbnail: thumbnail.png
categories: Backstage
tags:
  - hugo
  - meta
  - selfhosting
---
I've lately seen some folks on [social.lol](https://social.lol) posting about their various strategies for automatically generating [Open Graph images](https://ogp.me/) for their [Eleventy](https://11ty.dev) sites. So this weekend I started exploring ways to do that for my [Hugo](https://gohugo.io) site.

During my search, I came across a few different approaches using external services or additional scripts to run at build time. I eventually came across a post from Aaro titled [Generating OpenGraph images with Hugo](https://aarol.dev/posts/hugo-og-image/) which seemed like exactly what I was after, as it uses Hugo's built-in [image functions](https://gohugo.io/functions/images/filter/) to dynamically create the image.

I wound up borrowing heavily from Aaro's approach and then adding a few additional capabilities, notably the ability to overlay a designated thumbnail image on top of the resulting OpenGraph image. I'm sure this could be further optimized by someone who knows what they're doing[^future].

[^future]: Like Future John, perhaps? Past John loves leaving stuff for that guy to figure out.

In any case, here's what I did to get this working.

### New resources
Based on Aaro's suggestions, I started by creating a 1200x600 image to use as the base. I used [GIMP](https://www.gimp.org/) for this. I'm not a graphic designer[^web] so I kept it simple while emulating the "logo" displayed at the top of the page:

![Red background with a command prompt displaying "[runtimeterror.dev] $" in white and red font.](og_base.png)

[^web]: Or web designer, if I'm being honest.

That fits with the theme of the site, and leaves plenty of room for text to be added to the image.

The site uses the Fira Mono font family, and I'd like to use that to ensure the share image is consistent with the site styling. So I also grabbed `FiraMono-Regular.ttf` from the [Fira GitHub](https://github.com/mozilla/Fira).

I stashed both of those resources in my `assets/` folder:
![File explorer window showing a directory structure with folders such as '.github/workflows', 'archetypes', 'assets' with subfolders 'css', 'js', and files 'FiraMono-Regular.ttf', 'og_base.png' under 'RUNTIMETERROR'.](new_resources.png)

### OpenGraph partial
Hugo uses an [internal template](https://github.com/gohugoio/hugo/blob/master/tpl/tplimpl/embedded/templates/opengraph.html) for rendering OpenGraph properties by default. I'll need to import that as a partial so that I can override its behavior. So I drop the following in `layouts/partials/opengraph.html` as a starting point:

```jinja-html
// torchlight! {"lineNumbers": true}
<meta property="og:title" content="{{ .Title }}" />
<meta property="og:description" content="{{ with .Description }}{{ . }}{{ else }}{{if .IsPage}}{{ .Summary }}{{ else }}{{ with .Site.Params.description }}{{ . }}{{ end }}{{ end }}{{ end }}" />
<meta property="og:type" content="{{ if .IsPage }}article{{ else }}website{{ end }}" />
<meta property="og:url" content="{{ .Permalink }}" />
<meta property="og:locale" content="{{ .Lang }}" />

{{- if .IsPage }}
{{- $iso8601 := "2006-01-02T15:04:05-07:00" -}}
<meta property="article:section" content="{{ .Section }}" />
{{ with .PublishDate }}<meta property="article:published_time" {{ .Format $iso8601 | printf "content=%q" | safeHTMLAttr }} />{{ end }}
{{ with .Lastmod }}<meta property="article:modified_time" {{ .Format $iso8601 | printf "content=%q" | safeHTMLAttr }} />{{ end }}
{{- end -}}

{{- with .Params.audio }}<meta property="og:audio" content="{{ . }}" />{{ end }}
{{- with .Params.locale }}<meta property="og:locale" content="{{ . }}" />{{ end }}
{{- with .Site.Params.title }}<meta property="og:site_name" content="{{ . }}" />{{ end }}
{{- with .Params.videos }}{{- range . }}
<meta property="og:video" content="{{ . | absURL }}" />
{{ end }}{{ end }}
```