<script lang="ts">
  import type { UiCollectionEntry } from "@lib/types";
  import { onMount } from "svelte";
  import ArticleCard from "./ArticleCard.svelte";
  import type { FormEventHandler } from "svelte/elements";
  import { debounce } from "@lib/utils";
  import Search from "./Search/Search.svelte";

  export let articles: UiCollectionEntry<"articles">[] = [];

  const PAGE_SIZE = 16;

  let pageNumber = 1;
  let searchQuery = "";
  $: searchRegex = new RegExp(`.*${searchQuery}.*`, "gmi");

  let articleSlice: UiCollectionEntry<"articles">[];
  let maxPage = Math.ceil(articles.length / PAGE_SIZE);
  let totalResults: number;

  $: {
    const filteredArticles = articles.filter(({ collectionEntry }) => {
      return (
        searchRegex.test(collectionEntry.data.title) ||
        searchRegex.test(
          collectionEntry.data.tags.join(" ").replace("-", " ")
        ) ||
        searchQuery.length === 0
      );
    });

    totalResults = filteredArticles.length;
    maxPage = Math.ceil(filteredArticles.length / PAGE_SIZE);

    articleSlice = filteredArticles.slice(0, pageNumber * PAGE_SIZE);
  }

  const handleSearchInputChange: FormEventHandler<HTMLInputElement> = (ev) => {
    const target = ev.target as HTMLInputElement | null;

    if (target) {
      searchQuery = target.value;

      const url = new URL(window.location.href);

      if (searchQuery.length === 0) {
        url.searchParams.delete("q");
      } else {
        url.searchParams.set("q", searchQuery);
      }

      window.history.pushState({ path: url.toString() }, "", url.toString());

      pageNumber = 1;
    }
  };

  const debouncedHandleSearchInputChange = debounce(
    handleSearchInputChange,
    500
  );

  const handleScrollToBottom = () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight * 0.9
    ) {
      if (pageNumber + 1 <= maxPage) {
        pageNumber += 1;
      }
    }
  };

  onMount(() => {
    const url = new URL(window.location.href);

    if (url.searchParams.has("q")) {
      searchQuery = url.searchParams.get("q") ?? "";
    }
  });
</script>

<svelte:window on:scroll={handleScrollToBottom} />
<Search bind:searchValue={searchQuery} handleInput={debouncedHandleSearchInputChange} />
{#if totalResults !== null && searchQuery.length > 0}
  <p id="results">Results: {totalResults}</p>
{/if}
<ul class="cards">
  {#key articleSlice}
    {#each articleSlice as article}
      <ArticleCard articleEntry={article} />
    {/each}
  {/key}
</ul>
{#if pageNumber === maxPage}
  <p id="end">End of results</p>
{/if}

<style>
  p {
    margin: 0;
  }

  #end {
    color: var(--col1);
    text-align: center;
    font-size: 1.15em;
    margin-bottom: 0.5em;
  }

  #results {
    color: var(--col1);
  }
</style>
