<script lang="ts">
  import TablerUpload from "icons:svelte/tabler/upload";
  import TablerX from "icons:svelte/tabler/x";
  import type { MaybePromise } from "@lib/types";
  import { readFileAsBase64 } from "@lib/utils";

  export let id = "imageUpload";
  export let name = id;
  export let message = "Upload image";
  export let onUpload: (file: File | null) => MaybePromise<void>;
  export let onClear: (() => MaybePromise<void>) | undefined = undefined;
  export let initialImageOverride: string | undefined = undefined;

  let imageInputElement: HTMLInputElement;
  let uploadedFile: File | null = null;
  $: uploadedFileDataUrl = initialImageOverride ?? null;

  const readUploadedImage = async (uploadedFile: File | null) => {
    if (!uploadedFile) {
      uploadedFileDataUrl = null;
      return;
    }

    uploadedFileDataUrl = await readFileAsBase64(uploadedFile);
  };

  const onChange = async () => {
    uploadedFile = imageInputElement.files?.item(0) ?? null;

    await onUpload(uploadedFile);
    await readUploadedImage(uploadedFile);
  };

  const onImageClear = async () => {
    if (onClear) {
      await onClear();
    }
    uploadedFile = null;
    uploadedFileDataUrl = null;
    imageInputElement.value = "";
  };
</script>

<div class="image-upload-container">
  <n for={name}>
    <div
      class="image-upload-button-container"
      style={`display: ${uploadedFile || uploadedFileDataUrl ? "unset" : "none"}`}
    >
      <button on:click|preventDefault={onImageClear} type="button">
        <TablerX />
      </button>
      <img src={uploadedFileDataUrl} alt="cover preview" />
    </div>
    {#if uploadedFile}
      <p>{uploadedFile.name}</p>
    {:else}
      <TablerUpload class="upload-icon" />
    {/if}
    {message}
    <input
      bind:this={imageInputElement}
      on:change={onChange}
      {id}
      {name}
      type="file"
      accept="image/png, image/jpeg, image/avif, image/webp, image/gif"
    />
  </label>
</div>

<style>
  .image-upload-container {
    display: flex;
    flex-direction: column;
    border-radius: var(--buttoncurve);
    padding: calc(var(--fixedspace) * 0.5);
    background-color: var(--col1extradark);
  }

  .image-upload-container label {
    display: flex;
    flex-direction: column;
    gap: calc(var(--fixedspace) * 0.5);
    background-color: var(--col2);
    padding: var(--fixedspace);
    border-radius: var(--buttoncurve);
    color: var(--page);
    font-weight: 700;
    text-align: center;
    border: 1px solid transparent;
  }

  .image-upload-container label:hover {
    cursor: pointer;
    color: var(--col2);
    background-color: var(--page);
    border: 1px solid var(--col2);
  }

  .image-upload-container label p {
    font-weight: 500;
    margin: 0;
  }

  .image-upload-container img {
    align-self: center;
    height: 200px;
    border: 2px solid var(--col1dark);
  }

  .image-upload-container img:hover {
    cursor: default;
  }

  .image-upload-container input {
    display: none;
  }

  .image-upload-container :global(.upload-icon) {
    align-self: center;
    width: 30px;
    height: 30px;
  }

  .image-upload-button-container {
    position: relative;
    width: max-content;
    align-self: center;
  }

  .image-upload-button-container button {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--col2);
    border: 2px solid var(--col1dark);
    position: absolute;
    right: 0;
    border-top-right-radius: var(--buttoncurve);
    border-bottom-left-radius: var(--buttoncurve);
  }

  .image-upload-button-container button:hover {
    cursor: pointer;
    color: var(--col2);
    background-color: var(--page);
  }
</style>
