<script lang="ts">
  import Portal from "@components/Portal.svelte";
  import { onDestroy, onMount } from "svelte";
  import TablerX from 'icons:svelte/tabler/x';
  import Button from "./Button.svelte";
  import type { MaybePromise } from "@lib/types";

  type $$Props =
    | {
        onClose: () => MaybePromise<void>;
        title: string;
        withCancel?: boolean;
        cancelText?: string;
        withSubmit?: true;
        submitText?: string;
        onSubmit: () => MaybePromise<void>;
      }
    | {
        onClose: () => MaybePromise<void>;
        title: string;
        withCancel?: boolean;
        cancelText?: string;
        withSubmit?: false;
        submitText?: string;
        onSubmit?: () => MaybePromise<void>;
      };

  export let onClose: () => MaybePromise<void>;
  export let title: string;
  export let withCancel = false;
  export let cancelText = "Cancel";
  export let withSubmit = false;
  export let submitText = "Submit";
  export let onSubmit: (() => MaybePromise<void>) | undefined = undefined;
  let blocker: HTMLDivElement;

  const onKeyPress = async (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      await onClose();
    }
  };

  onMount(() => {
    if (blocker) {
      blocker.addEventListener("click", onClose);
    }

    document.addEventListener("keydown", onKeyPress);
  });

  onDestroy(() => {
    document.removeEventListener("keydown", onKeyPress);
  });
</script>

<Portal>
  <div class="blocker" bind:this={blocker} />
  <div class="modal">
    <div class="close-bar">
      <h1>{title}</h1>
      <Button onClick={onClose} title="close">
        <TablerX class="close-icon" />
      </Button>
    </div>
    <div class="body">
      <slot />
    </div>
    <div class="buttons">
      {#if withCancel}
        <Button onClick={onClose} title={cancelText}>{cancelText}</Button>
      {/if}
      {#if withSubmit && onSubmit}
        <Button onClick={onSubmit} title={submitText}>{submitText}</Button>
      {/if}
    </div>
  </div>
</Portal>

<style>
  .blocker {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background-color: var(--page);
    z-index: 1000;
    opacity: 75%;
  }

  .modal {
    background-color: var(--col1dark);
    border-radius: var(--buttoncurve);
    max-width: 450px;
    width: 90vw;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    padding: var(--fixedspace);
    display: flex;
    flex-direction: column;
    gap: var(--fixedspace);
  }

  .close-bar {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .close-bar h1 {
    margin: 0;
  }

  .close-bar :global(.close-icon) {
    width: 25px;
    height: 25px;
  }

  .body {
    width: 100%;
    flex: 1;
  }

  .buttons {
    display: flex;
    justify-content: space-between;
  }

  .buttons :global(button) {
    padding: calc(var(--fixedspace) * 0.5);
  }
</style>
