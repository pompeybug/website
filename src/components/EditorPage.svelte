<script lang="ts">
  import { onMount, onDestroy } from "svelte";
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
  import { BubbleMenu, createEditor, Editor } from "svelte-tiptap";
  import type { Readable } from "svelte/store";

  type ArticleData = Pick<CollectionEntry<"articles">, "body" | "data"> & {
    coverImage?: GetImageResult;
  };

  let editor: Readable<Editor>;
  let contentLoaded = false;
  let title = "";
  let originalArticleData: ArticleData;
  let renderCoverImage = false;
  let coverImageElement: HTMLImageElement | undefined;
  let uploadedFiles: Map<string, File> = new Map();

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

          setTimeout(() => {
            if (originalArticleData.coverImage && coverImageElement) {
              coverImageElement.setAttribute(
                "src",
                originalArticleData.coverImage.src
              );
            }
          }, 1);
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
      onCreate: () => {
        const k = $editor.$nodes('image');
        console.debug(k);
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

    formData.set("content", markdownContent);

    console.debug(markdownContent);

    // const response = await fetch("/api/submit", {
    //   method: "PUT",
    //   body: formData,
    // });
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
    <button>submit</button>
  </div>
  <div id="sidebar"></div>
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
    flex: 3;
    background-color: var(--col1dark);
    padding: var(--fixedspace);
    border-radius: var(--buttoncurve);
    gap: var(--fixedspace);
  }

  #sidebar {
    position: sticky;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  :global(.title-input) {
    font-size: 16pt;
  }
</style>
