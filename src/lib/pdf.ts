import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

type PdfTextItem = {
  str?: string
  hasEOL?: boolean
}

const PAGE_MARKER = '\n---PAGE---\n'

export async function extractPdfText(file: File) {
  const data = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data }).promise

  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const lines: string[] = []
    let currentLine = ''

    for (const rawItem of content.items) {
      const item = rawItem as PdfTextItem
      const value = (item.str ?? '').trim()
      if (value) currentLine += `${currentLine ? ' ' : ''}${value}`
      if (item.hasEOL && currentLine) {
        lines.push(currentLine)
        currentLine = ''
      }
    }
    if (currentLine) lines.push(currentLine)
    pages.push(lines.join('\n'))
  }

  const extracted = pages.join(PAGE_MARKER).trim()
  if (!extracted) {
    throw new Error(`${file.name}에서 읽을 수 있는 텍스트를 찾지 못했습니다. 스캔 PDF는 OCR이 필요합니다.`)
  }
  return extracted
}

export function cleanPdfText(rawText: string) {
  const pages = rawText.split(PAGE_MARKER)
  const lineFrequency = new Map<string, number>()
  const normalizedPages = pages.map((page) =>
    page
      .split(/\r?\n/)
      .map(normalizeLine)
      .filter(Boolean),
  )

  normalizedPages.forEach((lines) => {
    new Set(lines).forEach((line) => {
      if (line.length < 120) lineFrequency.set(line, (lineFrequency.get(line) ?? 0) + 1)
    })
  })

  const repetitionThreshold = Math.max(2, Math.ceil(pages.length * 0.35))
  const cleanedLines = normalizedPages.flatMap((lines) =>
    lines.filter((line) => {
      if (isPageNumber(line)) return false
      return (lineFrequency.get(line) ?? 0) < repetitionThreshold
    }),
  )

  return trimToArticleBody(rebuildSemanticText(cleanedLines))
}

function normalizeLine(line: string) {
  return line
    .normalize('NFKC')
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code > 31 && code !== 127
    })
    .join('')
    .replace(/[•●▪◦■◆▶►]/g, ' • ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isPageNumber(line: string) {
  return /^(?:page\s*)?\d{1,4}(?:\s*\/\s*\d{1,4})?$/i.test(line) ||
    /^[-–—]\s*\d{1,4}\s*[-–—]$/.test(line)
}

function rebuildSemanticText(lines: string[]) {
  const paragraphs: string[] = []
  let buffer = ''

  const flush = () => {
    const value = buffer.replace(/\s+/g, ' ').trim()
    if (value && !paragraphs.includes(value)) paragraphs.push(value)
    buffer = ''
  }

  for (const line of lines) {
    const isBullet = /^[-–—•]\s*/.test(line) || /^\d+[.)]\s+/.test(line)
    const shortHeading = isLikelyHeading(line)
    if (isBullet || shortHeading) flush()

    const joined = line
      .replace(/^[-–—•]\s*/, '')
      .replace(/(\p{L})-\s+(?=\p{Ll})/gu, '$1')
    buffer += `${buffer ? ' ' : ''}${joined}`

    if (/[.!?。][”"']?$/.test(line) || isBullet || shortHeading || buffer.length > 600) flush()
  }
  flush()

  return paragraphs.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function isLikelyHeading(line: string) {
  if (/[.!?。][”"']?$/.test(line)) return false
  if (line.length < 60) return true
  if (line.length <= 95 && /[:：]/.test(line)) return true
  if (line.length <= 95 && /(?:전시하다|말하다|주목하다|이유|전망|시사점|문법|공식|전략|체크포인트)$/.test(line)) return true
  return false
}

function trimToArticleBody(text: string) {
  const paragraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean)
  if (paragraphs.length <= 2) return text

  const searchLimit = Math.min(paragraphs.length, 14)
  const bodyStartIndex = paragraphs.slice(0, searchLimit).findIndex((paragraph, index) => {
    if (isNonArticleIntro(paragraph)) return false
    if (index > 0 && isNonArticleIntro(paragraphs[index - 1]) && paragraph.length >= 45) return true
    return isLikelyArticleBody(paragraph)
  })

  const trimmed = bodyStartIndex > 0 ? paragraphs.slice(bodyStartIndex) : paragraphs
  return trimmed
    .filter((paragraph, index) => index >= 8 || !isNonArticleIntro(paragraph))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isNonArticleIntro(paragraph: string) {
  return /(?:안녕하세요|기자입니다|에디터입니다|뉴스레터|구독|구독자|멤버십|오늘은|이번\s*기사에서는|이번\s*글에서는|이번\s*뉴스레터에서는|연재\s*소개|읽어주셔서|더밀크\s*구독|TheMiilk\s*구독|The\s*Miilk\s*구독)/i.test(paragraph)
}

function isLikelyArticleBody(paragraph: string) {
  if (paragraph.length < 55) return false
  if (isNonArticleIntro(paragraph)) return false
  return /(?:전망|투자|시장|기업|산업|기술|정책|전략|예산|수요|공급|경쟁|반도체|AI|드론|데이터센터|전력|인프라|\d+(?:[.,]\d+)?\s*(?:%|조|억|만|달러|원))/.test(paragraph)
}
