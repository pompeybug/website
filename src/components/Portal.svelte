<script lang="ts">
  // taken from https://github.com/sveltejs/svelte/issues/3088#issuecomment-505785516
  import { onMount, onDestroy } from "svelte";
  let ref: HTMLDivElement;
  let portal: HTMLDivElement;

  onMount(() => {
    portal = document.createElement("div");
    portal.className = "portal";
    document.body.appendChild(portal);
    portal.appendChild(ref);
  });

  onDestroy(() => {
    document.body.removeChild(portal);
  });
</script>

<div class="portal-clone">
  <div bind:this={ref}>
    <slot />
  </div>
</div>

<style>
  .portal-clone {
    display: none;
  }
</style>
