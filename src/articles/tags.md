---
title: All tags
pagination:
  data: collections
  size: 1
  alias: tag
permalink: /tags/{{ tag }}/
layout: layouts/base.njk
---
<h1>Tag: {{ tag }}</h1>

<ul class="mainmenu">
{% for post in collections[ tag ] reversed %}
  <li><a href="{{ post.url }}">{{ post.data.title }}</a></li>
{% endfor %}
</ul>

