---
title: Articles
description: A list of all articles on the site
layout: layouts/base.njk
date: 2000-01-01
eleventyExcludeFromCollections: true
---

<ul class="menu">
{% for post in collections.all reversed  %}
<li><a class="link" href="{{post.url}}">{{ post.data.title }}</a></li>
{% endfor %}
</ul>
