<script lang="ts">
  import ImageUpload from "@components/ImageUpload.svelte";
  import LabelledInput from "@components/Input/LabelledInput.svelte";
  import Modal from "@components/Modal.svelte";
  import type { MaybePromise } from "@lib/types";

  export let onClose: () => MaybePromise<void>;
  export let onSubmit: (
    file: File | null,
    imageDescription: string
  ) => MaybePromise<void>;
  export let initialImageFile: File | undefined = undefined;
  export let initialImageBase64: string | undefined = undefined;
  export let initialImageDescription: string | undefined = undefined;

  let imageFile: File | null = initialImageFile ?? null;
  let imageDescription: string = initialImageDescription ?? "";

  const onClear = () => {
    imageFile = null;
  };

  const onUpload = (file: File | null) => {
    imageFile = file;
  };
</script>

<Modal
  title="Add an image"
  {onClose}
  withCancel
  withSubmit
  onSubmit={async () => await onSubmit(imageFile, imageDescription)}
>
  <div id="image-modal">
    <ImageUpload
      {onClear}
      {onUpload}
      initialImageOverride={initialImageBase64}
    />
    <LabelledInput
      bind:value={imageDescription}
      id="image-description-input"
      label="Image description"
      placeholder="Image description"
    />
  </div>
</Modal>
