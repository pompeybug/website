<script lang="ts">
  import type { Readable } from "svelte/store";
  import type { MaybePromise } from "@lib/types";
  import type { Editor } from "@tiptap/core";
  import type { ComponentType } from "svelte";

  export let editor: Readable<Editor>;
  export let activeType: string | undefined = undefined;
  export let title = activeType;
  export let ariaLabel = title;
  export let onClick: () => MaybePromise<void | boolean>;
  export let icon: ComponentType;
</script>

<button
  {title}
  aria-label={ariaLabel}
  type="button"
  on:click={onClick}
  class:active={activeType ? $editor.isActive(activeType) : false}
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

  button > :global(svg) {
    font-size: 1.5em;
  }
</style>
