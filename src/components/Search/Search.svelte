<script lang="ts">
  import SearchIcon from "@components/Icons/SearchIcon.svelte";
  import Input from "@components/Input/Input.svelte";
  import type { FormEventHandler } from "svelte/elements";

  export let id = "search";
  export let placeholder = "Search...";
  export let title = "search";
  export let searchValue = "";
  export let handleInput: FormEventHandler<HTMLInputElement>;
</script>

<div class="search-container">
  <SearchIcon className="search-icon" />
  <Input {id} {placeholder} {title} value={searchValue} {handleInput} />
</div>

<style>
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
