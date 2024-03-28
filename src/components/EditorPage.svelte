<script lang="ts">
  import { onMount } from "svelte";
  import StarterKit from "@tiptap/starter-kit";
  import Link from "@tiptap/extension-link";
  import Underline from "@tiptap/extension-underline";
  import Image from "@tiptap/extension-image";
  import { Markdown } from "tiptap-markdown";
  import Input from "@components/Input/Input.svelte";
  import EditorComponent from "@components/Editor/Editor.svelte";
  import type { CollectionEntry } from "astro:content";
  import type { GetImageResult } from "astro";
  import type { Readable } from "svelte/store";
  import LabelledCheckbox from "./Input/LabelledCheckbox.svelte";
  import LabelledInput from "./Input/LabelledInput.svelte";
  import createEditor from "src/stores/editor";
  import type { Editor } from "@tiptap/core";
  import Loader from "./Loader.svelte";
  import ImageUpload from "./ImageUpload.svelte";
  import createUploadedFiles, {
    type UploadedFileStore,
  } from "src/stores/uploadedFiles";

  type ArticleData = Pick<
    CollectionEntry<"articles">,
    "body" | "data" | "slug"
  > & {
    coverImage?: GetImageResult;
    originalFiles: Record<string, string>;
  };

  type ArticleStateCoverImageInitial = {
    isInitialCoverImage: true;
    file: string;
  };

  type ArticleStateCoverImageNormal = {
    isInitialCoverImage: false;
    file: File | null;
  };

  type ArticleState = {
    title: string;
    coverImage: ArticleStateCoverImageInitial | ArticleStateCoverImageNormal;
    uploadedFiles: UploadedFileStore;
    author: string;
    showAuthor: boolean;
  };

  export let session: import("@auth/core/types").Session;
  let editor: Readable<Editor>;
  let editorReady = false;
  let originalArticleData: ArticleData;
  let showAuthor = true;
  let saving = false;

  const data: ArticleState = {
    title: "",
    coverImage: {
      isInitialCoverImage: false,
      file: null,
    },
    uploadedFiles: createUploadedFiles(),
    author: session.user?.name ?? "",
    showAuthor: true,
  };

  onMount(async () => {
    let content = "<p>Your content here</p>";
    const urlParams = new URLSearchParams(window.location.search);

    const article = urlParams.get("article");

    if (article) {
      const res = await fetch(`/api/content/${article}?coverImageHeight=500`);

      if (res.ok) {
        originalArticleData = await res.json();
        content = originalArticleData.body;
        data.title = originalArticleData.data.title;

        Object.entries(originalArticleData.originalFiles).forEach(
          ([src, filename]) => {
            data.uploadedFiles.addFile(filename, null, src);
          }
        );

        if (originalArticleData.coverImage) {
          data.coverImage.isInitialCoverImage = true;
          data.coverImage.file = originalArticleData.coverImage.src;
        }
      }
    }

    editor = createEditor({
      extensions: [
        StarterKit,
        Markdown,
        Link.configure({
          openOnClick: false,
        }),
        Underline,
        Image.extend({
          addAttributes() {
            return {
              src: {
                default: "",
              },
              alt: {
                default: undefined,
              },
            };
          },
        }),
      ],
      onTransaction({ transaction }) {
        const history = transaction.getMeta("history$");

        if (!history) {
          return;
        }

        const addedFiles: string[] = [];
        const deletedFiles: string[] = [];

        transaction.steps.forEach((step) => {
          const stepJson = step.toJSON();

          if (stepJson.slice) {
            addedFiles.push(
              ...stepJson.slice.content
                .filter((content: any) => content.type === "image")
                .map((content: any) => content.attrs.src)
            );
          }

          const deletion = transaction.before.slice(stepJson.from, stepJson.to);

          deletion.content.forEach((node) => {
            if (node.type.name === "image") {
              deletedFiles.push(node.attrs.src);
            }
          });
        });

        deletedFiles.forEach((filename) => {
          data.uploadedFiles.updateFileByMarkdownFilename(filename, {
            deleted: true,
          });
        });
        addedFiles.forEach((filename) => {
          data.uploadedFiles.updateFileByMarkdownFilename(filename, {
            deleted: false,
          });
        });
      },
      content,
      editorProps: {
        attributes: {
          class: "editor",
        },
      },
    });

    editorReady = true;
  });

  const submit = async (e: SubmitEvent) => {
    const formData = new FormData(e.currentTarget as HTMLFormElement);

    let markdownContent = $editor.storage.markdown.getMarkdown() as string;

    $uploadedFiles.forEach((file) => {
      if (file.deleted && file.type === 'local') {
        return;
      }

      markdownContent = markdownContent.replace(
        file.markdownFilename,
        `./${file.filename}`
      );

      if (file.file) {
        formData.append("uploads", file.file, file.filename);
      } else {
        formData.append("uploads", new File([], file.filename), file.filename);
      }

      formData.append(
        "uploadStates",
        JSON.stringify({ deleted: file.deleted, type: file.type })
      );
    });

    formData.append("content", markdownContent);

    if (originalArticleData?.data) {
      formData.append("slug", originalArticleData.slug);
    }

    // Empty file inputs still have a file object in them, it's just a File object with a size of 0.
    // We can't set the input element value programmatically, so when loading a cover image from an existing article
    // the size of the File object will be 0.
    // But we reset the src attribute on the preview image when the user actually delete the upload, which indicates
    // the cover image has been deleted.
    // File size > 0: User has uploaded a new cover image
    // File size = 0: User hasn't touched the cover image
    // Preview image src = '': User has removed the existing cover image
    if (!coverImageElement?.getAttribute("src")) {
      formData.delete("coverImage");
    }

    console.debug([...formData.entries()]);

    // return;

    saving = true;

    let response: Response;

    if (originalArticleData) {
      response = await fetch("/api/content/submit", {
        method: "PUT",
        body: formData,
      });
    } else {
      response = await fetch("/api/content/submit", {
        method: "POST",
        body: formData,
      });
    }

    saving = false;
  };

  $: console.dir(data);
  const { uploadedFiles } = data;
  $: console.dir($uploadedFiles);
</script>

<div id="container">
  <div id="editor">
    <Input
      id="title"
      placeholder="Article title"
      title="title"
      class="title-input"
      bind:value={data.title}
    />
    <ImageUpload
      id="coverImage"
      message="Upload cover image"
      onUpload={(file) => {
        data.coverImage.file = file;
        data.coverImage.isInitialCoverImage = false;
      }}
      onClear={() => {
        data.coverImage.file = null;
        data.coverImage.isInitialCoverImage = false;
      }}
      initialImageOverride={data.coverImage.isInitialCoverImage
        ? data.coverImage.file
        : undefined}
    />
    <EditorComponent
      {editor}
      {editorReady}
      uploadedFiles={data.uploadedFiles}
    />
    <div id="article-options">
      <h2>Article Options</h2>
      <div>
        <LabelledCheckbox
          label="Publish article:"
          id="publish-article-checkbox"
          name="publish"
        />
        <p>
          If left unchecked, this article will only be visible to logged in
          users and in the UNPUBLISHED-PAGE
        </p>
      </div>
      <LabelledCheckbox
        label="Show author:"
        name="showAuthor"
        id="show-author-checkbox"
        bind:checked={data.showAuthor}
      />
      {#if showAuthor}
        <LabelledInput
          id="author-name-input"
          name="authorName"
          label="Author Name"
          placeholder="author name"
          bind:value={data.author}
        />
      {/if}
    </div>
    <button on:click|preventDefault={submit}>submit</button>
  </div>
  {#if saving}
    <div id="loader">
      <Loader />
      <h1>Saving</h1>
    </div>
  {/if}
</div>

<style>
  #container {
    display: flex;
    flex-direction: column;
    gap: var(--fixedspace);
    position: relative;
  }

  #loader {
    position: absolute;
    height: 100%;
    width: 100%;
    background-color: var(--page);
    opacity: 75%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--fixedspace);
    flex-direction: column;
  }

  #loader h1 {
    margin: 0;
    font-size: 2em;
    font-weight: 500;
  }

  #loader :global(svg) {
    font-size: 2em;
  }

  #editor {
    display: flex;
    flex-direction: column;
    background-color: var(--col1dark);
    padding: var(--fixedspace);
    border-radius: var(--buttoncurve);
    gap: var(--fixedspace);
  }

  #article-options {
    display: flex;
    flex-direction: column;
    background-color: var(--col1extradark);
    padding: var(--fixedspace);
    border-radius: var(--buttoncurve);
    gap: var(--fixedspace);
  }

  :global(.title-input) {
    font-size: 16pt;
  }
</style>
