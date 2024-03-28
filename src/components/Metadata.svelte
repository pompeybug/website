<script lang="ts">
  export let date: Date | null = null;
</script>

{#if date}
  <aside id="date" class="published" data-pagefind-ignore>
    <img
      src="/img/calendar.svg"
      alt="Publication date"
      title="Publication date"
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
