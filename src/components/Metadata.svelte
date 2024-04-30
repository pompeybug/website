<script lang="ts">
  export let date: Date | null = null;
  export let imageLoadingMethod: "lazy" | "eager";
</script>

{#if date}
  <aside id="date" class="published">
    <img
      src="/img/calendar.svg"
      alt="Publication date"
      title="Publication date"
      width="16"
      height="24"
      loading={imageLoadingMethod}
      decoding="async"
    />
    {date
      .toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      .replace(",", "")}
  </aside>
{/if}
