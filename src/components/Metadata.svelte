<script lang="ts">
  export let date: Date | null = null;
  export let loading: "eager" | "lazy";
</script>

{#if date}
  <aside id="date" class="published">
    <img
      src="/img/calendar.svg"
      alt="Publication date"
      title="Publication date"
      width={16}
      height={24}
      {loading}
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
