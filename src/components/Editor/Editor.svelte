<script lang="ts">
  import type { Level } from "@tiptap/extension-heading";
  import LoadIcon from "@components/Icons/LoadIcon.svelte";
  import BoldIcon from "@components/Icons/BoldIcon.svelte";
  import ItalicIcon from "@components/Icons/ItalicIcon.svelte";
  import StrikethroughIcon from "@components/Icons/StrikethroughIcon.svelte";
  import BulletListIcon from "@components/Icons/BulletListIcon.svelte";
  import NumberListIcon from "@components/Icons/NumberListIcon.svelte";
  import UnderlineIcon from "@components/Icons/UnderlineIcon.svelte";
  import CodeIcon from "@components/Icons/CodeIcon.svelte";
  import BlockquoteIcon from "@components/Icons/BlockquoteIcon.svelte";
  import LinkIcon from "@components/Icons/LinkIcon.svelte";
  import UnlinkIcon from "@components/Icons/UnlinkIcon.svelte";
  import UndoIcon from "@components/Icons/UndoIcon.svelte";
  import RedoIcon from "@components/Icons/RedoIcon.svelte";
  import PhotoAddIcon from "@components/Icons/PhotoAddIcon.svelte";
  import PhotoMinusIcon from "@components/Icons/PhotoMinusIcon.svelte";
  import EditIcon from "@components/Icons/EditIcon.svelte";
  import TrashIcon from "@components/Icons/TrashIcon.svelte";
  import ToolbarButton from "./ToolbarButton.svelte";
  import Modal from "@components/Modal.svelte";
  import ImageUpload from "@components/ImageUpload.svelte";
  import LabelledInput from "@components/Input/LabelledInput.svelte";
  import { BubbleMenu, EditorContent } from "svelte-tiptap";
  import type { Readable } from "svelte/store";
  import type { Editor } from "svelte-tiptap";
  import type { BubbleMenuPluginProps } from "@tiptap/extension-bubble-menu";
  import Button from "@components/Button.svelte";
  import { nanoid } from "nanoid";

  export let editor: Readable<Editor>;
  export let editorReady: boolean;
  export let uploadedFiles: Map<string, File>;
  let showLinkDialog = false;
  let linkUrl: string;
  let externalLink = false;
  let showAddImageDialog = false;
  let imageDescription = "";

  let currentImageFileList: FileList | undefined;
  let currentImageBase64: string;

  type ImageAttributes = {
    src: string;
    alt?: string;
    title?: string;
    id?: string;
  };

  const textTypeOptions = [
    { value: 0, text: "Paragraph" },
    { value: 1, text: "Heading 1" },
    { value: 2, text: "Heading 2" },
    { value: 3, text: "Heading 3" },
    { value: 4, text: "Heading 4" },
    { value: 5, text: "Heading 5" },
    { value: 6, text: "Heading 6" },
  ];

  const onTextTypeOptionChange = (ev: Event) => {
    const target = ev.target as HTMLSelectElement;

    if (target.value === "0") {
      $editor.chain().focus().setParagraph().run();
    } else {
      $editor
        .chain()
        .focus()
        .toggleHeading({ level: Number(target.value) as Level })
        .run();
    }
  };

  const onShowLinkDialog = () => {
    linkUrl = $editor.getAttributes("link").href || "";
    externalLink = $editor.getAttributes("link").target === "_blank";
    showLinkDialog = true;
  };

  const onLinkSubmit = () => {
    showLinkDialog = false;

    if (linkUrl.length === 0) {
      return;
    }

    $editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: linkUrl,
        target: externalLink ? "_blank" : null,
      })
      .run();

    linkUrl = "";
    externalLink = false;
  };

  const onShowAddImageDialog = () => {
    showAddImageDialog = true;
  };

  const onImageUploadSubmit = () => {
    if (!currentImageFileList || currentImageFileList.length === 0) {
      return;
    }

    const uploadedImage = currentImageFileList[0];

    const id = nanoid();

    const args: ImageAttributes = {
      src: currentImageBase64,
      alt: imageDescription,
      id,
    };

    $editor.commands.setImage(args);

    uploadedFiles.set(id, uploadedImage);

    showAddImageDialog = false;
    currentImageFileList = undefined;
    imageDescription = "";
  };

  const shouldShow: BubbleMenuPluginProps["shouldShow"] = () => {
    return $editor.isEditable || !showLinkDialog || !showAddImageDialog;
  };

  const toggleBold = () => $editor.chain().focus().toggleBold().run();
  const toggleItalic = () => $editor.chain().focus().toggleItalic().run();
  const toggleStrikethrough = () =>
    $editor.chain().focus().toggleStrike().run();
  const toggleUnderline = () => $editor.chain().focus().toggleUnderline().run();
  const toggleBulletList = () =>
    $editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () =>
    $editor.chain().focus().toggleOrderedList().run();
  const toggleCode = () => $editor.chain().focus().toggleCode().run();
  const toggleBlockquote = () =>
    $editor.chain().focus().toggleBlockquote().run();
  const unsetLink = () => $editor.chain().focus().unsetLink().run();

  const deleteImage = () => {
    if ($editor.isActive("image")) {
      const id = $editor.getAttributes("image").id;
      uploadedFiles.delete(id);
      $editor.commands.deleteSelection();
    }
  };

  const undo = () => $editor.commands.undo();
  const redo = () => $editor.commands.redo();
</script>

<div id="editor-container">
  {#if editorReady}
    <BubbleMenu editor={$editor} {shouldShow} tippyOptions={{ zIndex: 999 }}>
      <div id="bubble-menu">
        {#if $editor.isActive("link")}
          <Button title="Edit link" onClick={onShowLinkDialog}>
            <p>
              {$editor.getAttributes("link").href}
            </p>
            <EditIcon />
          </Button>
          <Button title="Delete link" onClick={unsetLink}>
            <UnlinkIcon />
          </Button>
        {:else if $editor.isActive("image")}
          <Button title="Delete image" onClick={deleteImage}>
            <p>
              {uploadedFiles.get($editor.getAttributes("image").id)?.name ??
                $editor.getAttributes("image").alt}
            </p>
            <TrashIcon />
          </Button>
        {/if}
      </div>
    </BubbleMenu>
    <div id="editor-toolbar">
      <select
        title="text type"
        value={$editor.isActive("heading")
          ? $editor.getAttributes("heading").level
          : 0}
        on:change={onTextTypeOptionChange}
      >
        {#each textTypeOptions as textTypeOption}
          <option value={textTypeOption.value}>
            {textTypeOption.text}
          </option>
        {/each}
      </select>
      <div class="separator" role="separator" />
      <div class="editor-toolbar-group">
        <ToolbarButton
          {editor}
          activeType="bold"
          title="toggle bold"
          icon={BoldIcon}
          onClick={toggleBold}
        />
        <ToolbarButton
          {editor}
          activeType="italic"
          title="toggle italic"
          icon={ItalicIcon}
          onClick={toggleItalic}
        />
        <ToolbarButton
          {editor}
          activeType="strike"
          title="toggle strikethrough"
          icon={StrikethroughIcon}
          onClick={toggleStrikethrough}
        />
        <ToolbarButton
          {editor}
          activeType="underline"
          title="toggle underline"
          icon={UnderlineIcon}
          onClick={toggleUnderline}
        />
      </div>
      <div class="separator" role="separator" />
      <div class="editor-toolbar-group">
        <ToolbarButton
          {editor}
          activeType="bulletList"
          title="toggle bullet list"
          icon={BulletListIcon}
          onClick={toggleBulletList}
        />
        <ToolbarButton
          {editor}
          activeType="orderedList"
          title="toggle numbered list"
          icon={NumberListIcon}
          onClick={toggleOrderedList}
        />
      </div>
      <div class="separator" role="separator" />
      <div class="editor-toolbar-group">
        <ToolbarButton
          {editor}
          activeType="code"
          title="toggle code"
          icon={CodeIcon}
          onClick={toggleCode}
        />
        <ToolbarButton
          {editor}
          activeType="blockquote"
          title="toggle blockquote"
          icon={BlockquoteIcon}
          onClick={toggleBlockquote}
        />
      </div>
      <div class="separator" role="separator" />
      <div class="editor-toolbar-group">
        <ToolbarButton
          {editor}
          title="add link"
          icon={LinkIcon}
          onClick={onShowLinkDialog}
        />
        <ToolbarButton
          {editor}
          activeType="link"
          title="remove link"
          icon={UnlinkIcon}
          onClick={unsetLink}
        />
      </div>
      <div class="separator" role="separator" />
      <div class="editor-toolbar-group">
        <ToolbarButton
          {editor}
          title="add image"
          icon={PhotoAddIcon}
          onClick={onShowAddImageDialog}
        />
        <ToolbarButton
          {editor}
          activeType="image"
          title="delete image"
          icon={PhotoMinusIcon}
          onClick={deleteImage}
        />
      </div>
      <div class="separator" role="separator" />
      <div class="editor-toolbar-group">
        <ToolbarButton
          {editor}
          activeType="undo (ctrl/cmd + z)"
          icon={UndoIcon}
          onClick={undo}
        />
        <ToolbarButton
          {editor}
          activeType="redo (ctrl/cmd + shift + z)"
          icon={RedoIcon}
          onClick={redo}
        />
      </div>
      <button
        type="button"
        on:click={() => {
          console.debug($editor.getJSON());
          console.debug($editor.storage.markdown.getMarkdown());
        }}>log</button
      >
    </div>
  {:else}
    <div id="loader">
      <LoadIcon className="load-icon" />
    </div>
  {/if}

  <EditorContent editor={$editor} />

  {#if showLinkDialog}
    <Modal
      title="Add a link"
      onClose={() => {
        showLinkDialog = false;
      }}
      withCancel
      withSubmit
      onSubmit={onLinkSubmit}
    >
      <div id="link-modal">
        <LabelledInput
          bind:value={linkUrl}
          label="Link URL"
          placeholder="Link url"
          onEnter={onLinkSubmit}
        />
        <div id="external-link-input">
          <label for="external-link">External link:</label>
          <input
            id="external-link"
            type="checkbox"
            bind:checked={externalLink}
          />
        </div>
      </div>
    </Modal>
  {/if}

  {#if showAddImageDialog}
    <Modal
      title="Add an image"
      onClose={() => {
        showAddImageDialog = false;
      }}
      withCancel
      withSubmit
      onSubmit={onImageUploadSubmit}
    >
      <div id="image-modal">
        <ImageUpload
          bind:imageFiles={currentImageFileList}
          bind:imageBase64={currentImageBase64}
        />
        <LabelledInput
          bind:value={imageDescription}
          label="Image description"
          placeholder="Image description"
        />
      </div>
    </Modal>
  {/if}
</div>

<style>
  #editor-container {
    display: flex;
    flex-direction: column;
    gap: calc(var(--fixedspace));
    background-color: var(--col1dark);
  }

  :global(.editor) {
    background-color: var(--col1extradark);
    padding: var(--fixedspace);
    border-radius: var(--buttoncurve);
  }

  #editor-toolbar {
    display: flex;
    gap: calc(var(--fixedspace) * 0.3);
    background-color: var(--col1extradark);
    padding: calc(var(--fixedspace) * 0.5);
    border-radius: var(--buttoncurve);
    flex-wrap: wrap;
  }

  .editor-toolbar-group {
    display: flex;
    gap: calc(var(--fixedspace) * 0.4);
  }

  .separator {
    width: 1px;
    background-color: var(--midgrey);
    margin-left: 1px;
    margin-right: 1px;
  }

  :global(.load-icon) {
    animation: spin 1s ease-in-out infinite;
    width: 50px;
    height: 50px;
    color: var(--col1);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  #loader {
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
  }

  :global(#link-modal) {
    display: flex;
    flex-direction: column;
    gap: var(--fixedspace);
  }

  :global(#link-modal) #external-link-input {
    display: flex;
    align-items: center;
    gap: calc(var(--fixedspace) * 0.5);
  }

  :global(#link-modal) #external-link-input input {
    margin: 0;
  }

  :global(#image-modal) {
    display: flex;
    flex-direction: column;
    gap: var(--fixedspace);
  }

  :global(#bubble-menu) {
    display: flex;
    gap: calc(var(--fixedspace) * 0.5);
  }

  :global(#bubble-menu) :global(button) {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: calc(var(--fixedspace) * 0.25);
    padding: calc(var(--fixedspace) * 0.1);
  }

  :global(#bubble-menu) p {
    margin: 0;
  }
</style>
