<script lang="ts">
  import { onMount, tick } from "svelte";
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

  type ArticleData = Pick<CollectionEntry<"articles">, "body" | "data"> & {
    coverImage?: GetImageResult;
    originalFiles: Record<string, string>;
  };

  export let session: import("@auth/core/types").Session;
  let editor: Readable<Editor>;
  let contentLoaded = false;
  let title = "";
  let originalArticleData: ArticleData;
  let renderCoverImage = false;
  let coverImageElement: HTMLImageElement | undefined;
  let uploadedFiles: Map<string, File> = new Map();
  let showAuthor = true;
  let coverImageDeleted = false;

  $: editorReady = $editor && contentLoaded;

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

        if (originalArticleData.coverImage) {
          renderCoverImage = true;

          await tick();

          if (originalArticleData.coverImage && coverImageElement) {
            coverImageElement.setAttribute(
              "src",
              originalArticleData.coverImage.src
            );
          }
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

    contentLoaded = true;
  });

  const submit = async (e: SubmitEvent) => {
    const formData = new FormData(e.currentTarget as HTMLFormElement);

    let markdownContent: string = $editor.storage.markdown.getMarkdown();

    uploadedFiles.forEach((file, id) => {
      const uploadedImage = document.querySelector<HTMLImageElement>(
        `.editor img[id="${id}"]`
      );

      if (uploadedImage) {
        markdownContent = markdownContent.replace(
          uploadedImage.src,
          `./${file.name}`
        );
        formData.append("uploads", file, file.name);
      }
    });

    if (originalArticleData?.originalFiles) {
      Object.entries(originalArticleData.originalFiles)
        .filter(([url]) => !markdownContent.includes(url))
        .forEach(([, file]) => formData.append("deletedFiles", file));

      Object.entries(originalArticleData.originalFiles).forEach(
        ([url, file]) => {
          markdownContent = markdownContent.replace(url, `./${file}`);
        }
      );
    }

    formData.append("content", markdownContent);

    if (originalArticleData?.data) {
      formData.append(
        "originalSlug",
        originalArticleData.data.originalSlug ?? ""
      );
    }

    console.debug([...formData.entries()]);

    return;

    const response = await fetch("/api/submit", {
      method: "PUT",
      body: formData,
    });
  };
</script>

<form id="container" on:submit|preventDefault={submit}>
  <div id="editor">
    <Input
      id="title"
      placeholder="Article title"
      title="title"
      className="title-input"
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
</form>

<style>
  #container {
    display: flex;
    flex-direction: column;
    gap: var(--fixedspace);
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
