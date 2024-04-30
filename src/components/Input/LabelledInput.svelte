<script lang="ts">
  import Input from "@components/Input/Input.svelte";
  import type { ComponentProps } from "svelte";

  export let label: string;
  export let value = "";
  export let inputProps: ComponentProps<Input> & { id: string };
</script>

<div class="input">
  <label for={inputProps.id}>{label}</label>
  <Input {...{ ...inputProps, ariaLabel: label, title: label }} bind:value />
</div>

<style>
  .input {
    display: flex;
    flex-direction: column;
    gap: calc(var(--fixedspace) * 0.5);
  }
</style>
