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

During my search, I came across a few different approaches using external services or additional scripts to run at build time. I eventually came across a post from Aaro titled [Generating OpenGraph images with Hugo](https://aarol.dev/posts/hugo-og-image/) which seemed like exactly what I was after, as it uses Hugo's built-in [image functions](https://gohugo.io/functions/images/filter/) to dynamically create the image by layering text on top of a base.

I ended up borrowing heavily from Aaro's approach with a few variants for the OpenGraph image:
- When sharing the home page, the image includes the site description.
- When sharing a post, the image includes the post title.
- ... but if the post has a thumbnail[^thumbnail] listed in the front matter, that gets added to the corner of the `og:image`.

[^thumbnail]: My current theme doesn't make use of the thumbnails, but a previous theme did so I've got a bunch of posts with thumbnails still assigned. And now I've got a use for them again!

I'm sure this could be further optimized by someone who knows what they're doing[^future]. In any case, here's what I did to get this working.

[^future]: Like Future John, perhaps? Past John loves leaving stuff for that guy to figure out.

### New resources
Based on Aaro's suggestions, I started by creating a 1200x600 image to use as the base. I used [GIMP](https://www.gimp.org/) for this.

I'm not a graphic designer[^web] so I kept it simple. I wanted to be sure that the text matched the font used on the site, so I downloaded the [Fira Mono `.ttf`](https://github.com/mozilla/Fira/blob/master/ttf/FiraMono-Regular.ttf) to `~/.fonts/` to make it available within GIMP. And then I emulated the colors and style of the "logo" displayed at the top of the page.

![Red background with a command prompt displaying "[runtimeterror.dev] $" in white and red font.](og_base.png)

[^web]: Or web designer, if I'm being honest.

That fits with the theme of the site, and leaves plenty of room for text to be added to the image.

I'll want to also use that font for the text overlay, so I stashed both of those resources in my `assets/` folder:
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

To use this new partial, I'll add it to my `layouts/partials/head.html`:

```jinja-html
{{ partial "opengraph" . }}
```

which is in turn loaded by `layouts/_defaults/baseof.html`:

```jinja-html
  <head>
    {{- partial "head.html" . -}}
  </head>
```

### Aaro's OG image generation
[Aaro's code](https://aarol.dev/posts/hugo-og-image/) provides the base functionality for what I need:

```jinja-html
{{/* Generate opengraph image */}}
{{- if .IsPage -}}
  {{ $base := resources.Get "og_base.png" }}
  {{ $boldFont := resources.Get "/Inter-SemiBold.ttf"}}
  {{ $mediumFont := resources.Get "/Inter-Medium.ttf"}}
  {{ $img := $base.Filter (images.Text .Site.Title (dict
    "color" "#ffffff"
    "size" 52
    "linespacing" 2
    "x" 141
    "y" 117
    "font" $boldFont
  ))}}
  {{ $img = $img.Filter (images.Text .Page.Title (dict
    "color" "#ffffff"
    "size" 64
    "linespacing" 2
    "x" 141
    "y" 291
    "font" $mediumFont
  ))}}
  {{ $img = resources.Copy (path.Join .Page.RelPermalink "og.png") $img }}
  <meta property="og:image" content="{{$img.Permalink}}">
  <meta property="og:image:width" content="{{$img.Width}}" />
  <meta property="og:image:height" content="{{$img.Height}}" />

  <!-- Twitter metadata (used by other websites as well) -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{{ .Title }}" />
  <meta name="twitter:description" content="{{ with .Description }}{{ . }}{{ else }}{{if .IsPage}}{{ .Summary }}{{ else }}{{ with .Site.Params.description }}{{ . }}{{ end }}{{ end }}{{ end -}}"/>
  <meta name="twitter:image" content="{{$img.Permalink}}" />
{{ end }}
```

The [`resources.Get`](https://gohugo.io/functions/resources/get/) bits import the image and font resources to make them available to the [`images.Text`](https://gohugo.io/functions/images/text/) functions, which add the site and page title texts to the image using the designated color, size, placement, and font.

The `resources.Copy` line moves the generated OG image into the post bundle directory and gives it a clean `og.png` name rather than the very-long randomly-generated name it would have by default.

And then the `<meta ... />` lines insert the generated image into the page's `<head>` block so it can be rendered when the link is shared on sites which support OpenGraph.

This is a great starting point for what I want to accomplish, but I'm going to make some changes in my `opengraph.html` partial.

### My tweaks
As I mentioned earlier, I want to have basically three recipes for baking my OG images: one for the homepage, one for standard posts, and one for posts with an associated thumbnail. They'll all use the same basic code, though, so I wanted to be sure that my setup didn't repeat itself too much.

```jinja-html
// torchlight! {"lineNumbers": true}
{{ $img := resources.Get "og_base.png" }}
{{ $font := resources.Get "/FiraMono-Regular.ttf" }}
{{ $text := "" }}
<meta property="og:title" content="{{ .Title }}" />
<meta property="og:description" content="{{ with .Description }}{{ . }}{{ else }}{{if .IsPage}}{{ .Summary }}{{ else }}{{ with .Site.Params.description }}{{ . }}{{ end }}{{ end }}{{ end }}" />
<meta property="og:type" content="{{ if .IsPage }}article{{ else }}website{{ end }}" />
<meta property="og:url" content="{{ .Permalink }}" />
<meta property="og:locale" content="{{ .Lang }}" />
{{- if .IsHome }}
{{ $text = .Site.Params.Description }}
{{- end }}

{{- if .IsPage }}
{{- $iso8601 := "2006-01-02T15:04:05-07:00" -}}
<meta property="article:section" content="{{ .Section }}" />
{{ with .PublishDate }}<meta property="article:published_time" {{ .Format $iso8601 | printf "content=%q" | safeHTMLAttr }} />{{ end }}
{{ with .Lastmod }}<meta property="article:modified_time" {{ .Format $iso8601 | printf "content=%q" | safeHTMLAttr }} />{{ end }}
{{ $text = .Page.Title }}
{{ end }}

{{- with .Params.thumbnail }}
{{ $thumbnail := $.Resources.Get . }}
{{ with $thumbnail }}
{{ $img = $img.Filter (images.Overlay (.Process "fit 300x250") 875 38 )}}
{{ end }}{{ end }}
{{ $img = $img.Filter (images.Text $text (dict
  "color" "#d8d8d8"
  "size" 64
  "linespacing" 2
  "x" 40
  "y" 300
  "font" $font
))}}
{{ $img = resources.Copy (path.Join $.Page.RelPermalink "og.png") $img }}

<meta property="og:image" content="{{$img.Permalink}}">
<meta property="og:image:width" content="{{$img.Width}}" />
<meta property="og:image:height" content="{{$img.Height}}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{{ .Title }}" />
<meta name="twitter:description" content="{{ with .Description }}{{ . }}{{ else }}{{if .IsPage}}{{ .Summary }}{{ else }}{{ with .Site.Params.description }}{{ . }}{{ end }}{{ end }}{{ end -}}"/>
<meta name="twitter:image" content="{{$img.Permalink}}" />

{{- with .Params.audio }}<meta property="og:audio" content="{{ . }}" />{{ end }}
{{- with .Site.Params.title }}<meta property="og:site_name" content="{{ . }}" />{{ end }}
{{- with .Params.videos }}{{- range . }}
<meta property="og:video" content="{{ . | absURL }}" />
{{ end }}{{ end }}
```