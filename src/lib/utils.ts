import type { MaybePromise } from "./types";

export const debounce = <
  T extends (...args: Parameters<T>) => MaybePromise<void>
>(
  cb: T,
  timeout: number
) => {
  let timer: number;

  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = window.setTimeout(async () => await cb(...args), timeout);
  };
};

export const toTitleCase = (text: string) => {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const readFileAsBase64 = async (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (reader.result) {
        resolve(reader.result.toString());
      } else {
        reject();
      }
    });

    reader.addEventListener("abort", () => reject());
    reader.addEventListener("error", () => reject());

    reader.readAsDataURL(file);
  });
};
