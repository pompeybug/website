---
pagination:
  data: collections
  size: 1
  alias: tag
permalink: /tags/{{ tag }}/
layout: layouts/base.njk
eleventyExcludeFromCollections: true
---
<h1>Tag: {{ tag }}</h1>
<p>A list of articles that have been tagged: <a href="/tags/{{ tag }}/">{{tag}}</a>

<ul class="menu">
{% for post in collections[ tag ] reversed %}
  <li><a href="{{ post.url }}">{{ post.data.title }}</a></li>
{% endfor %}
</ul>
