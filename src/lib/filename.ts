export function getDisplayFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.pdf$/i, '').trim()
  return withoutExtension
    .replace(/^\s*\d{6,8}[._-]\s*/, '')
    .replace(/\s*-\s*더밀크.*$/i, '')
    .replace(/\s*[_|·-]\s*The\s*Miilk.*$/i, '')
    .replace(/[\s_.·|-]+$/g, '')
    .trim()
}
