<script lang="ts">
  import Metadata from "./Metadata.svelte";
  import type { UiCollectionEntry } from "@lib/types";
  export let articleEntry: UiCollectionEntry<"articles">;

  const { collectionEntry: article, rendered } = articleEntry;
</script>

<li class="card">
  <section>
    <a href={`/${article.slug}`} class="hidden-link">
      {#if article.data.coverImage}
        <!-- Will migrate this back to an optimised image in the future -->
        <img
          src={article.data.coverImage.src}
          alt={article.data.title}
          height={100}
        />
      {:else}
        <div class="placeholder">
          <img src="/img/logo-w.svg" alt="The PCF Logo" />
        </div>
      {/if}
    </a>
    <div class="card-body">
      <h2>
        <a href={`/${article.slug}`}>{article.data.title}</a>
      </h2>
      <Metadata date={article.data.date} />
      <p>
        {rendered.remarkPluginFrontmatter.strippedBody
          .split(" ")
          .slice(0, 20)
          .join(" ")}...
      </p>
      <ul>
        {#each article.data.tags as tag}
          <li>
            <a href={`/tags/${tag}`} class="no-visit">
              {tag}
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </section>
</li>
