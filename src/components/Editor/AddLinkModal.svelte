<script lang="ts">
  import LabelledCheckbox from "@components/Input/LabelledCheckbox.svelte";
  import LabelledInput from "@components/Input/LabelledInput.svelte";
  import Modal from "@components/Modal.svelte";
  import type { MaybePromise } from "@lib/types";

  export let onClose: () => MaybePromise<void>;
  export let onSubmit: (
    linkUrl: string | null,
    externalUrl: boolean
  ) => MaybePromise<void>;
  export let initialLinkUrl: string | undefined = undefined;
  export let initialExternalLink: boolean | undefined = undefined;

  let linkUrl = initialLinkUrl ?? "";
  let externalLink = initialExternalLink ?? false;

  const onSubmitInternal = async () => {
    await onSubmit(linkUrl ?? null, externalLink);
  };
</script>

<Modal
  title="Add a link"
  {onClose}
  withCancel
  withSubmit
  onSubmit={onSubmitInternal}
>
  <div id="link-modal">
    <LabelledInput
      bind:value={linkUrl}
      id="link-url-input"
      label="Link URL"
      placeholder="Link url"
      onEnter={onSubmitInternal}
    />
    <LabelledCheckbox
      bind:checked={externalLink}
      label="External link:"
      id="external-link-checkbox"
    />
  </div>
</Modal>
