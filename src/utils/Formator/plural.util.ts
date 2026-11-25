/** `plural(1, "category")` → "1 category", `plural(2, "category")` → "2 categories". */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
