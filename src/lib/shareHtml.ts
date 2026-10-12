import { getDisplayFileName } from './filename'
import type { PdfSummary } from '../types'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

async function pdfDataUrl(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768))
  }
  return `data:application/pdf;base64,${btoa(binary)}`
}

export async function createShareHtml(summaries: PdfSummary[], files: File[]) {
  if (!summaries.length) throw new Error('저장할 요약이 없습니다.')
  const cards: string[] = []
  for (const [index, summary] of summaries.entries()) {
    const file = files[index]
    if (!file || file.name !== summary.fileName) {
      throw new Error(`${summary.fileName}: 원본 PDF 파일을 찾을 수 없습니다. 다시 업로드해 주세요.`)
    }
    const displayName = getDisplayFileName(summary.fileName)
    cards.push(`<article>
      <h2${displayName.length > 72 ? ' class="compact-title"' : ''}><a href="${await pdfDataUrl(file)}" download="${escapeHtml(file.name)}" title="원본 PDF 다운로드">${escapeHtml(displayName)}</a></h2>
      <ul>${summary.bullets.slice(0, 2).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>
    </article>`)
  }
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PDF 파일 요약</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #0f172a; font-family: Arial, "Malgun Gothic", sans-serif; }
    main { width: 1080px; max-width: 100%; margin: 0 auto; padding: 16px; }
    header { display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 8px; }
    h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -.025em; }
    .brand { font-size: 11px; font-weight: 800; letter-spacing: .16em; color: #0e7490; }
    .ai { margin-left: auto; border-radius: 999px; padding: 4px 10px; background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 700; }
    article { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 6px; }
    h2 { margin: 0 0 8px; font-size: 15px; font-weight: 700; line-height: 20px; letter-spacing: -.01em; }
    .compact-title { font-size: 13px; }
    h2 a { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: inherit; text-decoration: none; }
    h2 a:hover { text-decoration: underline; }
    h2 a:focus-visible { outline: 2px solid #0891b2; outline-offset: 2px; }
    ul { margin: 0; border-top: 1px solid #f1f5f9; padding: 8px 0 0; list-style: none; }
    li { display: flex; gap: 6px; margin-top: 4px; font-size: 15px; line-height: 20px; color: #334155; overflow-wrap: anywhere; }
    li:first-child { margin-top: 0; }
    li::before { content: ''; flex: 0 0 6px; height: 6px; margin-top: 7px; border-radius: 50%; background: #0891b2; }
    .help { margin: 12px 0 0; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <main>
    <header><h1>PDF 파일 요약</h1><span class="brand">THE MIILK PDF SUMMARY</span><span class="ai">AI 활용 요약 페이지</span></header>
    ${cards.join('\n')}
    <p class="help">각 제목을 누르면 원본 PDF를 다운로드할 수 있습니다.</p>
  </main>
</body>
</html>`
}
