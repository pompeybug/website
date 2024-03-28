import { writable, type Readable } from "svelte/store";

export type UploadedFileType = "local" | "remote";

export type UploadedFile = {
  filename: string;
  markdownFilename: string;
  file: File | null;
  deleted: boolean;
  type: UploadedFileType;
};

export interface UploadedFileStore extends Readable<UploadedFile[]> {
  addFile: (
    filename: string,
    file?: File | null,
    markdownFilename?: string,
    deleted?: boolean,
    type?: UploadedFileType
  ) => void;
  updateFileByMarkdownFilename: (
    filename: string,
    file: Partial<Omit<UploadedFile, "filename" | "type" | "markdownFilename">>
  ) => void;
}

const determineType = (filename: string) => {
  return filename.startsWith("/_image") ? "remote" : "local";
};

const createUploadedFiles = (
  initialFiles: UploadedFile[] = []
): UploadedFileStore => {
  const { subscribe, update } = writable(initialFiles);

  const addFile = (
    filename: string,
    file: File | null = null,
    markdownFilename: string = filename,
    deleted: boolean = false,
    type: UploadedFileType = determineType(markdownFilename)
  ) => {
    update((uploadedFiles) => [
      ...uploadedFiles,
      {
        filename,
        file,
        markdownFilename,
        deleted,
        type,
      },
    ]);
  };

  const updateFileByMarkdownFilename = (
    filename: string,
    file: Partial<Omit<UploadedFile, "filename" | "type" | "markdownFilename">>
  ) => {
    update((uploadedFiles) => {
      return uploadedFiles.map((uploadedFile) => {
        if (uploadedFile.markdownFilename === filename) {
          return { ...uploadedFile, ...file };
        }

        return uploadedFile;
      });
    });
  };

  return {
    subscribe,
    addFile,
    updateFileByMarkdownFilename,
  };
};

export default createUploadedFiles;
