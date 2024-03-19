import { Editor, type EditorOptions } from "@tiptap/core";
import { readable, type Readable } from "svelte/store";

const createEditor = (options: Partial<EditorOptions>): Readable<Editor> => {
  const editor = new Editor(options);

  const { subscribe } = readable(editor, (set) => {
    editor.on("transaction", () => {
      set(editor);
    });

    return () => {
      editor.destroy();
    };
  });

  return { subscribe };
};

export default createEditor;
