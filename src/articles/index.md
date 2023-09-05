---
title: Articles
description: A list of all articles on the site
layout: layouts/base.njk
date: 2000-01-01
eleventyExcludeFromCollections: true
---

<ul class="mainmenu">
{% for post in collections.all reversed excludeFilter  %}
<li class="title"><a href="{{post.url}}">{{ post.data.title }}</a></li>
{% endfor %}
</ul>
