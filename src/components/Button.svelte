<script lang="ts">
  import type { MaybePromise } from "@lib/types";

  type T = $$Generic;

  export let type: "button" | "submit" | "reset" = "button";
  export let title: string;
  export let onClick: () => MaybePromise<T>;
  export let className = "";
</script>

<button {type} {title} on:click={onClick} class={className}>
  <slot />
</button>

<style>
  button {
    margin: 0;
    padding: 0;
    background-color: var(--col2);
    border-radius: var(--buttoncurve);
    border: 1px solid var(--col1dark);
    display: flex;
    justify-content: center;
    align-items: center;
    height: min-content;
  }

  button:hover {
    cursor: pointer;
    color: var(--col2);
    background-color: var(--page);
    border: 1px solid var(--col2);
  }
</style>
