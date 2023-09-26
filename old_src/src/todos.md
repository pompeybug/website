---
layout: layouts/article.njk
title: Articles with Todos
tags:
 - pcf
---

We always have articles with todos, why not take a look and see if you can contribute.

<ul class="menu">
{% for post in collections.todoCollection reversed %}
<li>
<a href="{{post.url}}">{{ post.data.title }}</a>
</li>
{% endfor %}
</ul>

