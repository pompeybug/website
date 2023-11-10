<script lang="ts">
  import Metadata from "./Metadata.svelte";
  import type { UiCollectionEntry } from "@lib/types";
  export let articleEntry: UiCollectionEntry<"articles">;

  const { collectionEntry: article, rendered, image: coverImage } = articleEntry;
</script>

<li class="card">
  <a href={`/${article.slug}`} class="hidden-link" title={article.data.title}>
    <div class="image-container">
      {#if coverImage}
        <img
          src={coverImage.src}
          alt={article.data.title}
          {...coverImage.attributes}
        />
      {:else}
        <div class="placeholder">
          <img src="/img/logo-w.svg" alt="The PCF Logo" />
        </div>
      {/if}
    </div>
    <div class="card-body">
      <h2>{article.data.title}</h2>
      <Metadata date={article.data.date} />
      <p>
        {rendered.remarkPluginFrontmatter.strippedBody
          .split(" ")
          .slice(0, 20)
          .join(" ")}...
      </p>
      {#if article.data.tags.length > 0}
        <ul>
          {#each article.data.tags as tag}
            <li>
              <a href={`/tags/${tag}`} class="no-visit">
                {tag}
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
    position: relative;
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
    position: absolute;
    border-radius: var(--card-curve);
    width: 100%;
    top: 50%;
    transform: translateY(-50%);
  }

  .placeholder {
    display: flex;
    border-radius: var(--card-curve);
    background-color: var(--col1light);
    height: var(--card-image-height);
    justify-content: center;
    align-items: center;
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
