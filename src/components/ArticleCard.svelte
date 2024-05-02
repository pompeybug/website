<script lang="ts">
  import Metadata from "./Metadata.svelte";
  import type { UiCollectionEntry } from "@lib/types";
  import { toTitleCase } from "@lib/utils";
  import slugify from "@sindresorhus/slugify";

  export let articleEntry: UiCollectionEntry<"articles">;
  export let index: number;

  const { collectionEntry: article, rendered, coverImage } = articleEntry;

  const loading = index < 6 ? "eager" : "lazy";
</script>

<li class="card">
  <a
    href={`/${article.slug}`}
    class="hidden-link"
    title={article.data.title}
    data-astro-prefetch
  >
    <div
      class="image-container"
      style={`align-items: ${article.data.coverImageAlignment}`}
    >
      {#if coverImage}
        <picture>
          <source srcset={coverImage.avif.src} type="image/avif" />
          <source srcset={coverImage.webp.src} type="image/webp" />
          <img
            {...coverImage.original}
            {loading}
            decoding="async"
            alt={article.data.title}
          />
        </picture>
      {:else}
        <div class="placeholder">
          <img src="/img/logo-w.svg" alt="The PCF Logo" {loading} />
        </div>
      {/if}
    </div>
    <div class="card-body">
      <h2>{article.data.title}</h2>
      <Metadata date={article.data.date} {loading} />
      <p>
        {rendered.remarkPluginFrontmatter.description
          .split(" ")
          .slice(0, 20)
          .join(" ")
          .replace(/\D$/gi, "")}...
      </p>
      {#if article.data.tags.length > 0}
        <ul>
          {#each article.data.tags as tag}
            <li>
              <a
                href={`/tags/${slugify(tag)}`}
                class="no-visit"
                data-astro-prefetch
              >
                {toTitleCase(tag.replaceAll("-", " "))}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </a>
</li>

<style>
  li.card {
    list-style: none;
    background-color: var(--page);
    border-radius: var(--card-curve);
    min-width: 0;
  }

  li.card > a {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: calc(var(--fixedspace) / 4);
  }

  li.card .image-container {
    display: flex;
    height: var(--card-image-height);
    overflow: hidden;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  li.card h2,
  li.card p {
    margin: 0;
  }

  li.card .image-container img {
    border-radius: var(--card-curve);
    width: 100%;
  }

  .placeholder {
    display: flex;
    border-radius: var(--card-curve);
    background-color: var(--col1light);
    height: var(--card-image-height);
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  .placeholder img {
    color: var(--col2);
    height: 4em;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: calc(var(--fixedspace) / 3);
    padding: 0 calc(var(--fixedspace) / 1.5) calc(var(--fixedspace) / 1.5)
      calc(var(--fixedspace) / 1.5);
  }

  .card-body h2 {
    font-size: 1.1em;
    font-weight: 900;
  }

  .card-body h2:hover {
    text-decoration: underline;
  }

  .card-body > p {
    overflow: hidden;
    line-height: 1.5em;
    color: var(--text);
  }

  .card-body ul a {
    width: max-content;
    padding: 0.2em 0.25em;
  }

  .card-body ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: calc(var(--fixedspace) / 4);
  }

  a.hidden-link {
    padding: 0;
    background: unset;
  }

  a.hidden-link:hover {
    background-color: unset;
    color: unset;
  }
</style>
