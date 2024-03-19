<script lang="ts">
  import UploadIcon from "@components/Icons/UploadIcon.svelte";
  import CloseIcon from "@components/Icons/CloseIcon.svelte";
  import type { MaybePromise } from "@lib/types";

  export let id = "imageUpload";
  export let name = id;
  export let imageInputElement: HTMLInputElement | undefined = undefined;
  export let imageElement: HTMLImageElement | undefined = undefined;
  export let imageFiles: FileList | undefined = undefined;
  export let renderImage = false;
  export let message = "Upload image";
  export let imageBase64 = "";
  export let onClear: (() => MaybePromise<void>) | undefined = undefined;

  const onImageChange = () => {
    if (imageFiles) {
      const coverImage = imageFiles[0];

      if (coverImage) {
        renderImage = true;

        const reader = new FileReader();

        reader.addEventListener("load", () => {
          if (imageElement && reader.result) {
            imageElement.setAttribute("src", reader.result.toString());
            imageBase64 = reader.result.toString();
          }
        });

        reader.readAsDataURL(coverImage);

        return;
      }
    }

    renderImage = false;
  };

  const onImageClear = async () => {
    if (onClear) {
      await onClear();
    }
    if (imageInputElement) {
      imageInputElement.value = "";
    }
    renderImage = false;
  };
</script>

<div class="image-upload-container">
  <label for={name}>
    {#if renderImage}
      <div class="image-upload-button-container">
        <button on:click|preventDefault={onImageClear} type="button">
          <CloseIcon />
        </button>
        <img bind:this={imageElement} src="" alt="cover preview" />
      </div>
      {#if imageFiles}
        {#each imageFiles as imageFile}
          <p>{imageFile.name}</p>
        {/each}
      {/if}
    {:else}
      <UploadIcon className="upload-icon" />
    {/if}
    {message}
    <input
      bind:this={imageInputElement}
      bind:files={imageFiles}
      on:change={onImageChange}
      {id}
      {name}
      type="file"
      accept="image/png, image/jpeg, image/avif, image/webp"
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
