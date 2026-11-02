export function normalizeSearch(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
    .normalize('NFD')
    .replace(/[\u3099\u309a\u309b\u309c]/g, '')
    .replace(/[\u30a1-\u30f6\u30fd-\u30fe]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0x60),
    )
}
