<script lang="ts">
  export let label: string;
  export let id: string;
  export let name = id;
  export let checked = false;
  export let inputElement: HTMLInputElement | undefined = undefined;
</script>

<div class="checkbox">
  <label for={id}>{label}</label>
  <input {id} {name} type="checkbox" bind:checked bind:this={inputElement} />
</div>

<style>
  .checkbox {
    display: flex;
    align-items: center;
    gap: calc(var(--fixedspace) * 0.5);
  }

  .checkbox input {
    margin: 0;
  }
</style>
