<script lang="ts">
  import SearchIcon from "@components/Icons/SearchIcon.svelte";
  import type { FormEventHandler } from "svelte/elements";

  export let id = "search";
  export let placeholder = "Search...";
  export let title = "search";
  export let searchValue = "";
  export let handleInput: FormEventHandler<HTMLInputElement>;
</script>

<div class="search-container">
  <SearchIcon className="search-icon" />
  <input
    id={id}
    placeholder={placeholder}
    title={title}
    value={searchValue}
    on:input={handleInput}
    class="search-input"
  />
</div>

<style>
  .search-input {
    flex: 1;
    background-color: transparent;
    border: 1px solid transparent;
    padding: 0.5em;
    border-bottom: 1px solid var(--search-colour);
    color: var(--col1);
  }

  .search-input:focus {
    outline: 1px solid var(--search-colour);
    border-radius: var(--buttoncurve);
    border: 1px solid transparent;
  }

  .search-container {
    display: flex;
    gap: calc(var(--fixedspace) / 2);
    justify-content: center;
    align-items: center;
  }

  .search-container :global(.search-icon) {
    stroke: var(--search-colour);
  }
</style>
