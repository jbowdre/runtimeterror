---
title: "The Slash Page Scoop"
date: 2024-05-30
# lastmod: 2024-05-30
draft: true
description: "I've added new slash pages to the site to share some background info on who I am, what I use, and how this site works."
featured: false
toc: true
reply: true
categories: Backstage
tags:
  - hugo
  - meta
---
Inspired by [Robb Knight](https://rknight.me/)'s recent [slash pages](https://slashpages.net/) site, I spent some time over the past week or two drafting some slash pages of my own.

> Slash pages are common pages you can add to your website, usually with a standard, root-level slug like `/now`, `/about`, or `/uses`. They tend to describe the individual behind the site and are distinguishing characteristics of the IndieWeb.

On a blog that is otherwise organized in a fairly chronological manner, slash pages provide a way share information out-of-band. I think they're great for more static content (like an about page that says who I am) as well as for content that may be regularly updated (like a changelog).

The pages that I've implemented (so far) include:
- [/about](/about) tells a bit about me and my background
- [/changelog](/changelog) is just *starting* to record some of visual/functional changes I make here
- [/colophon](/colophon) describes the technology and services used in producing/hosting this site
- [/homelab](/homelab) isn't a canonical slash page but it provides a lot of details about my homelab setup
- [/save](/save) shamelessly hosts referral links for things I love and think you'll love too
- [/uses](/uses) shares the stuff I use on a regular basis

And, of course, these are collected in one place at [/slashes](/slashes).

Feel free to stop here if you just want to check out the slash pages, or keep on reading for some nerd stuff about how I implemented them on my Hugo site.

### Implementation
All of my typical blog posts get created within the site's Hugo directory under `content/posts/`, like this one at `content/posts/the-slash-page-scoop/index.md`. They get indexed, automatically added to the list of posts on the home page, and show up in the RSS feed. I don't want my slash pages to get that treatment so I made them directly inside the `content` directory:

```
content
├── categories
├── posts
├── search
├── 404.md
├── _index.md
├── about.md [tl! ~~]
├── changelog.md  [tl! ~~]
├── colophon.md  [tl! ~~]
├── homelab.md  [tl! ~~]
├── save.md  [tl! ~~]
├── simplex.md
└── uses.md  [tl! ~~]
```

Easy enough, but I didn't then want to have to worry about manually updating a list of slash pages so I used [Hugo's Taxonomies](https://gohugo.io/content-management/taxonomies/) feature for that. I simply tagged each page with a new `slashes` category by adding it to the post's front matter:

```yaml
# torchlight! {"lineNumbers":true}
---
title: "/changelog"
date: "2024-05-26"
lastmod: "2024-05-30"
description: "Maybe I should keep a log of all my site-related tinkering?"
categories: slashes # [tl! ~~]
---
```

{{% notice note "Category Names" %}}
I really wanted to name the category `/slashes`, but that seems to trip up Hugo a bit when it comes to creating an archive of category posts. So I settled for `slashes` and came up with some workarounds to make it present the way I wanted.
{{% /notice %}}

Hugo will automatically generate an archive page for a given taxonomy term (so a post tagged with the category `slashes` would be listed at `$BASE_URL/category/slashes/`), but I like to have a bit of control over how those archive pages are actually presented. So I create a new file at `content/categories/slashes/_index.md` and drop in this front matter:

```yaml
# torchlight! {"lineNumbers":true}
---
title: /slashes
url: /slashes
aliases:
  - /categories/slashes
description: >
  My collection of slash pages.
---
```

The `slashes` in the file path tells Hugo which taxonomy it belongs to and so it can match the appropriately-categorized posts.

Just like with normal posts, the `title` field defines the title (duh) of the post; this way I can label the archive page as `/slashes` instead of just `slashes`.

The `url` field lets me override where the page will be served, and I added `/categories/slashes` as an alias so that anyone who hits that canonical URL will be automatically redirected.

Setting a `description` lets me choose what introductory text will be displayed at the top of the index page, as well as when it's shown at the next higher level archive (like `/categories/`).

Of course, I'd like to include a link to [slashpages.net](https://slashpages.net) to provide a bit more info about what these pages are, and I can't add hyperlinks to the description text. What I *can* do is edit the template which is used for rendering the archive page. In my case, that's at `layouts/partials/archive.html`, and it starts out like this:

```jinja-html
# torchlight! {"lineNumbers":true}
{{ $pages := .Pages }}
{{ if .IsHome }}
  {{ $pages = where site.RegularPages "Type" "in" site.Params.mainSections }}
{{ end }}
<header class="content__header">
{{ if .IsHome }}
  <h1>{{ site.Params.indexTitle | markdownify }}</h1>
{{ else }}
  <h1>{{ .Title | markdownify }}{{ if eq .Kind "term" }}&nbsp;<a target="_blank" href="{{ .Permalink }}feed.xml" aria-label="Category RSS"><i class="fa-solid fa-square-rss"></i></a>&nbsp;</h1> <!-- [tl! ~~] -->
  {{ with .Description }}<i>{{ . }}</i><hr>{{ else }}<br>{{ end }}
{{ end }}{{ end }}
  {{ .Content }}
</header>
```

Line 9 is where I had already modified the template to conditionally add an RSS link for category archive pages. I'm going to tweak the setup a bit to conditionally render designated text when the page `.Title` matches `/slashes`:

```jinja-html
# torchlight! {"lineNumbers":true}
{{ $pages := .Pages }}
{{ if .IsHome }}
  {{ $pages = where site.RegularPages "Type" "in" site.Params.mainSections }}
{{ end }}
<header class="content__header">
{{ if .IsHome }}
  <h1>{{ site.Params.indexTitle | markdownify }}</h1>
{{ else }}
  {{ if eq .Title "/slashes" }} <!-- [tl! **:3 ++:3 ] -->
    <h1>{{ .Title | markdownify }}</h1>
    <i>My collection of <a target="_blank" title="what's a slashpage?" href="https://slashpages.net">slash pages</a>.</i><hr>
  {{ else }}
    <h1>{{ .Title | markdownify }}{{ if eq .Kind "term" }}&nbsp;<a target="_blank" href="{{ .Permalink }}feed.xml" aria-label="Category RSS"><i class="fa-solid fa-square-rss"></i></a>&nbsp;</h1>
    {{ with .Description }}<i>{{ . }}</i><hr>{{ else }}<br>{{ end }}
  {{ end }} <!-- [tl! ** ++ ] -->
{{ end }}{{ end }}
  {{ .Content }}
</header>
```

So instead of rendering the `description` I defined in the front matter the archive page will show:

> *My collection of [slash pages](https://slashpages.net).*

While I'm at it, I'd like for the posts themselves to be listed in alphabetical order rather than sorted by date. So here's how the rest of my existing `archive.html` partial template handles displaying posts:

```jinja-html
# torchlight! {"lineNumbers":true}
{{- if eq .Kind "taxonomy" }} <!-- [tl! reindex(15) ] -->
  {{- if eq .Title "Tags" }}
    <div class="tagsArchive">
    {{- range $key, $value := .Site.Taxonomies }}
      {{- $slicedTags := ($value.ByCount) }}
      {{- range $slicedTags }}
        {{- if eq $key "tags"}}
          <div><a href='/{{ $key }}/{{ (replace .Name "#" "%23") | urlize }}/' title="{{ .Name }}">{{ .Name }}</a><sup>{{ .Count }}</sup></div>
        {{- end }}
      {{- end }}
    {{- end }}
  </div>
  {{- else }}
    {{- range .Pages.ByDate.Reverse }}
      {{- $postDate := .Date.Format "2006-01-02" }}
      {{- $updateDate := .Lastmod.Format "2006-01-02" }}
      <article class="post">
        <header class="post__header">
          <h1><a href="{{ .Permalink }}">{{ .Title | markdownify }}</a></h1>
          <p class="post__meta">
            <span class="date">["{{- $postDate }}"{{- if ne $postDate $updateDate }}, "{{ $updateDate }}"{{ end }}]</span>
          </p>
        </header>
        <section class="post__summary">
          {{ .Description }}
        </section>
        <hr>
      </article>
    {{ end }}
  {{- end }}
{{- else }}
  {{- range (.Paginate $pages).Pages }}
    {{- $postDate := .Date.Format "2006-01-02" }}
    {{- $updateDate := .Lastmod.Format "2006-01-02" }}
    <article class="post">
      <header class="post__header">
          <h1><a href="{{ .Permalink }}">{{ .Title | markdownify }}</a></h1>
          <p class="post__meta">
              <span class="date">["{{- $postDate }}"{{- if ne $postDate $updateDate }}, "{{ $updateDate }}"{{ end }}]</span>
          </p>
      </header>
      <section class="post__summary">
          {{ .Summary }}
      </section>
      <hr>
    </article>
  {{- end }}
  {{- template "_internal/pagination.html" . }}
{{- end }}
```

Basically: if it's the [tags](/tags/) archive page, it will list out all the tags in a compact way. If it's some other taxonomy page,
