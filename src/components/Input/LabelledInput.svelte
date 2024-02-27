<script lang="ts">
  import Input from "@components/Input/Input.svelte";
  import type { MaybePromise } from "@lib/types";

  export let label: string;
  export let value = '';
  export let id = "input";
  export let placeholder = "";
  export let onEnter: (() => MaybePromise<void>) | undefined = undefined;
</script>

<div class="input">
  <label for={id}>{label}</label>
  <Input {id} {placeholder} {onEnter} bind:value />
</div>

<style>
  .input {
    display: flex;
    flex-direction: column;
    gap: calc(var(--fixedspace) * 0.5);
  }
</style>
