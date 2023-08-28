---
title: PCF Index Page
description: This is an example build page
layout: layouts/base.hbs
exclude: true
---

<ul>
    {% for post in collections.all reversed %}
        <li class="title"><a href="{{post.url}}">{{ post.data.title }}</a></li>
    {% endfor %}
</ul>
