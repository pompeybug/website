<script lang="ts">
  import cn from "@lib/cx";
  import TablerLoader2 from "icons:svelte/tabler/loader-2";
</script>

<TablerLoader2 class={cn("loader", $$props.class)} style={$$props.style} />

<style>
  :global(.loader) {
    animation: spin 1s ease-in-out infinite;
    color: var(--col2);
  }

  @keyframes -global-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
