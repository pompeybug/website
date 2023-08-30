---
title: Article Index
description: This is an example build page
layout: layouts/base.hbs
exclude: true
date: 2000-01-01
---

<ul class="mainmenu">
{% for post in collections.all reversed | excludeFilter  %}
<li class="title"><a href="{{post.url}}">{{ post.data.title }}</a></li>
{% endfor %}
</ul>
