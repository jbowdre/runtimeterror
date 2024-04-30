---
title: "Prettify Hugo Rss Feed Xslt"
date: 2024-04-29
# lastmod: 2024-04-29
draft: true
description: "This is a new post about..."
featured: false
toc: true
comments: true
categories: Backstage
tags:
  - hugo
  - meta
---
I spent a bit of time several months back making my sure my site's RSS would work well in a feed reader. This meant making a *lot* of modifications to the [default Hugo RSS template](https://github.com/gohugoio/hugo/blob/master/tpl/tplimpl/embedded/templates/_default/rss.xml). I made it load the full article text rather than just the summary, present correctly-formatted code blocks with no loss of important whitespace, include inline images, and even pass online validation checks:

[![Validate my RSS feed](valid-rss-rogers.png)](http://validator.w3.org/feed/check.cgi?url=https%3A//runtimeterror.dev/feed.xml)

But while the feed looks great when rendered by a reader, the browser presentation left some to be desired...

![Ugly RSS rendered without styling](ugly-rss.png)

It feels like there should be a friendlier way to present a feed "landing page" to help users new to RSS figure out what they need to do in order to follow a blog - and there absolutely is. In much the same way that you can prettify plain HTML with the inclusion of a CSS stylesheet, you can also style boring XML using [eXtensible Stylesheet Language Transformations (XSLT)](https://www.w3schools.com/xml/xsl_intro.asp).

So this post will describe how I styled