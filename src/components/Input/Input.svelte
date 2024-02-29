<script lang="ts">
  import type { MaybePromise } from "@lib/types";
  import type { FormEventHandler } from "svelte/elements";

  export let id = "input";
  export let placeholder = "Input...";
  export let title = "input";
  export let value = "";
  export let handleInput: FormEventHandler<HTMLInputElement> | undefined =
    undefined;
  export let className = "";
  export let onEnter: (() => MaybePromise<void>) | undefined = undefined;
  export let name = id;

  const onKeyDown = async (ev: KeyboardEvent) => {
    if (ev.key === "Enter") {
      if (onEnter) {
        await onEnter();
      }
    }
  };
</script>

<input
  {id}
  {placeholder}
  {title}
  {name}
  bind:value
  on:input={handleInput}
  on:keydown={onKeyDown}
  class={"search-input " + className}
/>

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
</style>
