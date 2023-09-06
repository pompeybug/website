---
title: Articles
description: A list of all articles on the site
layout: layouts/base.njk
eleventyExcludeFromCollections: true
---

<ul class="menu">
{% for post in collections.all reversed  %}
<li><a href="{{post.url}}">{{ post.data.title }}</a>{{ post.taglist }}</li>
{% endfor %}
</ul>
