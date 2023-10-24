<script lang="ts">
  import ArticleCard from "./ArticleCard.svelte";
  import type { UiCollectionEntry } from "@lib/types";

  const PAGE_SIZE = 16;
  let page = 1;

  export let articles: UiCollectionEntry<"articles">[] = [];

  $: articleSlice = articles.slice(0, page * PAGE_SIZE);

  const handleScrollToBottom = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
      page += 1;
    }
  };
</script>

<svelte:window on:scroll={handleScrollToBottom} />
<ul class="cards">
  {#each articleSlice as article}
    <ArticleCard articleEntry={article} />
  {/each}
</ul>
