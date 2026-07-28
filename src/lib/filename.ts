export function getDisplayFileName(fileName: string) {
  const withoutExtension = fileName
    .normalize('NFKC')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.pdf$/i, '')
    .trim()
  return withoutExtension
    .replace(/^\s*\d{6,8}[._-]\s*/, '')
    .replace(/\s*-\s*더밀크.*$/i, '')
    .replace(/\s*[_|·-]\s*The\s*Miilk.*$/i, '')
    .replace(/[“”"']/g, '')
    .replace(/[\s_.·|-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
