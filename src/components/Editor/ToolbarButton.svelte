<script lang="ts">
  import type { Readable } from "svelte/store";

  import type { MaybePromise } from "@lib/types";
  import type { Editor } from "@tiptap/core";
  import type { ComponentType } from "svelte";

  type T = $$Generic;
  export let editor: Readable<Editor>;
  export let activeType: string | undefined = undefined;
  export let title = activeType;
  export let onClick: () => MaybePromise<T>;
  export let icon: ComponentType;
</script>

<button
  {title}
  type="button"
  on:click={onClick}
  class:active={activeType ? $editor.isActive(activeType) : null}
>
  <svelte:component this={icon} />
</button>

<style>
  button {
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--text);
    background-color: transparent;
    border: none;
    border-radius: var(--buttoncurve);
    padding: 0;
  }

  button.active {
    background-color: var(--col1);
  }

  button:hover {
    cursor: pointer;
    background-color: var(--col1light);
  }
</style>
