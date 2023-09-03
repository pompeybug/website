---
pagination:
  data: collections
  size: 1
  alias: tag
permalink: /tags/{{ tag }}/
layout: layouts/base.hbs
---
<h1>Tag: {{ tag }}</h1>

<ul>
{% for post in collections[ tag ] | reverse %}
  <li><a href="{{ post.url }}">{{ post.data.title }}</a></li>
{% endfor %}
</ul>
