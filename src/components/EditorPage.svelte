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
  import ImageUpload from "./ImageUpload.svelte";
  import type { Readable } from "svelte/store";
  import LabelledCheckbox from "./Input/LabelledCheckbox.svelte";
  import LabelledInput from "./Input/LabelledInput.svelte";
  import createEditor from "src/stores/editor";
  import type { Editor } from "@tiptap/core";
  import Loader from "./Loader.svelte";

  type ArticleData = Pick<CollectionEntry<"articles">, "body" | "data"> & {
    coverImage?: GetImageResult;
    originalFiles: Record<string, string>;
  };

  export let session: import("@auth/core/types").Session;
  let editor: Readable<Editor>;
  let editorReady = false;
  let title = "";
  let originalArticleData: ArticleData;
  let renderCoverImage = false;
  let coverImageElement: HTMLImageElement | undefined;
  let uploadedFiles: Map<string, File> = new Map();
  let showAuthor = true;
  let saving = false;

  onMount(async () => {
    let content = "<p>Your content here</p>";

    const urlParams = new URLSearchParams(window.location.search);

    const article = urlParams.get("article");

    if (article) {
      const res = await fetch(`/api/content/${article}?coverImageHeight=500`);

      if (res.ok) {
        originalArticleData = await res.json();
        content = originalArticleData.body;
        title = originalArticleData.data.title;

        console.debug(originalArticleData);

        // Add original files to uploaded files Map so we can get the filename
        Object.entries(originalArticleData.originalFiles).forEach(
          ([src, filename]) => {
            uploadedFiles.set(src, new File([], filename));
          }
        );

        if (originalArticleData.coverImage) {
          if (originalArticleData.coverImage && coverImageElement) {
            coverImageElement.setAttribute(
              "src",
              originalArticleData.coverImage.src
            );
          }

          renderCoverImage = true;
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
              title: {
                default: undefined,
              },
              id: {
                default: undefined,
              },
            };
          },
        }),
      ],
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

    let markdownContent: string = $editor.storage.markdown.getMarkdown();

    uploadedFiles.forEach((file, id) => {
      // Skip original files that were appended with an empty File object
      if (file.size === 0) {
        return;
      }

      // Make sure the upload still exists in the document, may have been removed via an undo/redo or another way we're not tracking
      const uploadedImage = document.querySelector<HTMLImageElement>(
        `.editor img[id="${id}"]`
      );

      if (uploadedImage) {
        // Replace the base64 string src with the markdown compatible image reference
        markdownContent = markdownContent.replace(
          uploadedImage.src,
          `./${file.name}`
        );
        formData.append("uploads", file, file.name);
      }
    });

    if (originalArticleData?.originalFiles) {
      // Determine whether any original files have been deleted
      Object.entries(originalArticleData.originalFiles)
        .filter(([url]) => !markdownContent.includes(url))
        .forEach(([, file]) => formData.append("deletedFiles", file));

      // Replace the astro image url src with the markdown compatible image reference
      Object.entries(originalArticleData.originalFiles).forEach(
        ([url, file]) => {
          markdownContent = markdownContent.replace(url, `./${file}`);
        }
      );
    }

    formData.append("content", markdownContent);

    if (originalArticleData?.data) {
      formData.append(
        "originalFrontmatter",
        JSON.stringify(originalArticleData.data)
      );
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
</script>

<form id="container" on:submit|preventDefault={submit}>
  <div id="editor">
    <Input
      id="title"
      placeholder="Article title"
      title="title"
      class="title-input"
      bind:value={title}
    />
    <ImageUpload
      id="coverImage"
      bind:imageElement={coverImageElement}
      bind:renderImage={renderCoverImage}
      message="Upload cover image"
    />
    <EditorComponent {editor} {editorReady} {uploadedFiles} />
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
        bind:checked={showAuthor}
      />
      {#if showAuthor}
        <LabelledInput
          id="author-name-input"
          name="authorName"
          label="Author Name"
          placeholder="author name"
          value={session.user?.name ?? ""}
        />
      {/if}
    </div>
    <button>submit</button>
  </div>
  {#if saving}
    <div id="loader">
      <Loader />
      <h1>Saving</h1>
    </div>
  {/if}
</form>

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
