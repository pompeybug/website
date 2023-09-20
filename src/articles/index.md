---
title: Articles
description: A list of all articles on the site
layout: layouts/base.njk
eleventyExcludeFromCollections: true
permalink: index.html
---

<ul class="menu">
{% for post in collections.all reversed  %}
<li><a href="{{post.url}}">{{ post.data.title }}</a></li>
{% endfor %}
</ul>
