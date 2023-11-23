export const debounce = <T extends (...args: Parameters<T>) => void>(
  cb: T,
  timeout: number
) => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => cb(...args), timeout);
  };
};

export const toTitleCase = (text: string) => {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};