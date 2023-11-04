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
