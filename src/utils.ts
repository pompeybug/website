export const toArray = <T>(i: T[] | T) => {
  if (!i) {
    return [];
  }
  
  return Array.isArray(i) ? i : [i];
};
