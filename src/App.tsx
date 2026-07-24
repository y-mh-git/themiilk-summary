import { useMemo, useRef, useState } from 'react'
import { toCanvas } from 'html-to-image'
import html2canvas from 'html2canvas'
import { AlertCircle, Check, CheckCircle2, Copy, Download, FileSearch, FileText, Loader2, Pencil, ShieldCheck, X } from 'lucide-react'
import { FileDropzone } from './components/FileDropzone'
import { SelectedFileList } from './components/SelectedFileList'
import { SelectionResults } from './components/SelectionResults'
import { SummaryCard } from './components/SummaryCard'
import { getDisplayFileName } from './lib/filename'
import { cleanPdfText, extractPdfText } from './lib/pdf'
import { evaluateMaterialSelections } from './services/materialSelector'
import { summarizePdfText } from './services/summarizer'
import type { MaterialSelection, PdfSummary, ProcessingState } from './types'

type DebugItem = { fileName: string; text: string }
type ShareStatus = { type: 'success' | 'error'; message: string } | null

function canvasHasContent(canvas: HTMLCanvasElement) {
  const probe = document.createElement('canvas')
  probe.width = 160
  probe.height = Math.max(1, Math.min(320, Math.round(160 * canvas.height / canvas.width)))
  const context = probe.getContext('2d', { willReadFrequently: true })
  if (!context) return false
  context.drawImage(canvas, 0, 0, probe.width, probe.height)
  const pixels = context.getImageData(0, 0, probe.width, probe.height).data
  let coloredPixels = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] < 242 || pixels[index + 1] < 242 || pixels[index + 2] < 242) {
      coloredPixels += 1
    }
  }
  return coloredPixels >= 24
}

export default function App() {
  const summaryPageRef = useRef<HTMLDivElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [summaries, setSummaries] = useState<PdfSummary[]>([])
  const [selections, setSelections] = useState<MaterialSelection[]>([])
  const [debugItems, setDebugItems] = useState<DebugItem[]>([])
  const [status, setStatus] = useState<ProcessingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<ShareStatus>(null)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [isEditingAll, setIsEditingAll] = useState(false)
  const [draftSummaries, setDraftSummaries] = useState<PdfSummary[]>([])
  const isProcessing = status === 'extracting' || status === 'summarizing'

  const statusLabel = useMemo(() => ({
    idle: '대기 중',
    extracting: '원문 추출·정제 중',
    summarizing: '근거 기반 요약 중',
    completed: '요약 완료',
    error: '처리 오류',
  })[status], [status])

  const handleFilesSelected = (selected: FileList) => {
    const next = Array.from(selected).filter((file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name))
    setFiles(next)
    setSummaries([])
    setSelections([])
    setDebugItems([])
    setError(next.length ? null : 'PDF 파일만 업로드할 수 있습니다.')
    setShareStatus(null)
    setIsEditingAll(false)
    setDraftSummaries([])
    setStatus(next.length ? 'idle' : 'error')
  }

  const handleMoveFile = (fromIndex: number, toIndex: number) => {
    if (isProcessing) return
    setFiles((current) => {
      if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    setSummaries([])
    setSelections([])
    setDebugItems([])
    setShareStatus(null)
    setIsEditingAll(false)
    setDraftSummaries([])
    setStatus('idle')
  }

  const handleCreateSummaries = async () => {
    if (!files.length) return
    setError(null)
    setSummaries([])
    setSelections([])
    setDebugItems([])

    try {
      setStatus('extracting')
      const extracted: DebugItem[] = []
      for (const file of files) {
        const cleaned = cleanPdfText(await extractPdfText(file))
        if (cleaned.length < 80) throw new Error(`${file.name}의 추출 텍스트가 너무 짧습니다. 스캔 PDF 여부를 확인해 주세요.`)
        extracted.push({ fileName: file.name, text: cleaned })
        console.debug(`[PDF 정제 미리보기] ${file.name}\n${cleaned.slice(0, 2000)}`)
      }
      setDebugItems(extracted)

      setStatus('summarizing')
      const results: PdfSummary[] = []
      for (const item of extracted) {
        results.push({ fileName: item.fileName, ...(await summarizePdfText(item.text, item.fileName)) })
        setSummaries([...results])
      }
      setSelections(await evaluateMaterialSelections(extracted))
      setStatus('completed')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'PDF 처리 중 오류가 발생했습니다.')
    }
  }

  const startEditingAll = () => {
    setDraftSummaries(summaries.map((summary) => ({ ...summary, bullets: [...summary.bullets] })))
    setShareStatus(null)
    setIsEditingAll(true)
  }

  const cancelEditingAll = () => {
    setDraftSummaries([])
    setShareStatus(null)
    setIsEditingAll(false)
  }

  const saveEditingAll = () => {
    const hasEmptyBullet = draftSummaries.some(
      (summary) => summary.bullets.slice(0, 2).length !== 2 || summary.bullets.slice(0, 2).some((bullet) => !bullet.trim()),
    )
    if (hasEmptyBullet) {
      setShareStatus({ type: 'error', message: '모든 카드의 요약 문장 2개를 입력해 주세요.' })
      return
    }
    setSummaries(draftSummaries.map((summary) => ({
      ...summary,
      bullets: summary.bullets.slice(0, 2).map((bullet) => {
        const normalized = bullet.replace(/\s+/g, ' ').trim()
        return normalized.endsWith('.') ? normalized : `${normalized}.`
      }),
    })))
    setDraftSummaries([])
    setIsEditingAll(false)
    setShareStatus({ type: 'success', message: '전체 요약의 수정 내용이 저장되었습니다.' })
  }

  const updateDraft = (fileName: string, bulletIndex: number, value: string) => {
    setDraftSummaries((current) => current.map((summary) => {
      if (summary.fileName !== fileName) return summary
      const bullets = [...summary.bullets]
      bullets[bulletIndex] = value
      return { ...summary, bullets }
    }))
  }

  const getAllSummaryText = () => [
    'THE MIILK PDF SUMMARY',
    'AI 활용 요약 페이지',
    'PDF 파일 요약',
    '',
    ...summaries.flatMap((summary) => [
      `[${getDisplayFileName(summary.fileName)}]`,
      `● ${summary.bullets[0] ?? ''}`,
      `● ${summary.bullets[1] ?? ''}`,
      '',
    ]),
  ].join('\n').trim()

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(getAllSummaryText())
      setShareStatus({ type: 'success', message: '전체 요약이 복사되었습니다.' })
    } catch (caught) {
      console.error('전체 요약 복사 실패:', caught)
      setShareStatus({ type: 'error', message: '클립보드 접근이 차단되어 전체 요약을 복사하지 못했습니다.' })
    }
  }

  const handleSaveAll = async () => {
    const sourceNode = summaryPageRef.current
    if (!sourceNode) {
      setShareStatus({ type: 'error', message: '이미지 저장 영역을 찾을 수 없습니다.' })
      return
    }
    setIsSavingImage(true)
    setShareStatus(null)
    let captureNode: HTMLDivElement | null = null
    try {
      const sourceWidth = Math.ceil(sourceNode.scrollWidth)
      captureNode = sourceNode.cloneNode(true) as HTMLDivElement
      Object.assign(captureNode.style, {
        position: 'fixed',
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        left: '0',
        top: '0',
        width: `${sourceWidth}px`,
        minWidth: `${sourceWidth}px`,
        maxWidth: 'none',
        height: 'auto',
        margin: '0',
        boxSizing: 'border-box',
        overflow: 'visible',
        transform: 'none',
        transformOrigin: 'top left',
        pointerEvents: 'none',
        zIndex: '2147483647',
      })
      document.body.appendChild(captureNode)

      await document.fonts.ready
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => window.setTimeout(resolve, 80))),
      )
      const captureWidth = Math.ceil(captureNode.scrollWidth)
      const captureHeight = Math.ceil(captureNode.scrollHeight)
      const captureRect = captureNode.getBoundingClientRect()
      console.log('[PDF 요약 이미지 캡처]', {
        element: captureNode,
        scrollWidth: captureWidth,
        scrollHeight: captureHeight,
        rect: captureRect,
        cards: captureNode.querySelectorAll('article').length,
      })
      if (captureWidth <= 0 || captureHeight <= 0 || captureRect.width <= 0 || captureRect.height <= 0) {
        throw new Error('이미지 저장 영역을 찾을 수 없습니다.')
      }

      let canvas: HTMLCanvasElement | null = null
      try {
        const primaryCanvas = await toCanvas(captureNode, {
          backgroundColor: '#ffffff',
          cacheBust: true,
          pixelRatio: 2,
          width: captureWidth,
          height: captureHeight,
          style: {
            position: 'relative',
            display: 'block',
            visibility: 'visible',
            opacity: '1',
            left: '0',
            top: '0',
            width: `${captureWidth}px`,
            height: `${captureHeight}px`,
            maxWidth: 'none',
            margin: '0',
            boxSizing: 'border-box',
            overflow: 'visible',
            transform: 'none',
            transformOrigin: 'top left',
            zIndex: '0',
          },
        })
        if (canvasHasContent(primaryCanvas)) canvas = primaryCanvas
        else console.warn('html-to-image 결과가 비어 있어 html2canvas로 재시도합니다.')
      } catch (primaryError) {
        console.warn('html-to-image 캡처 실패, html2canvas로 재시도합니다.', primaryError)
      }

      if (!canvas) {
        const fallbackCanvas = await html2canvas(captureNode, {
          backgroundColor: '#ffffff',
          scale: 2,
          width: captureWidth,
          height: captureHeight,
          windowWidth: captureWidth,
          windowHeight: captureHeight,
          scrollX: 0,
          scrollY: 0,
          useCORS: true,
          logging: false,
        })
        if (!canvasHasContent(fallbackCanvas)) {
          throw new Error('이미지 내용 렌더링에 실패했습니다. 다시 시도해 주세요.')
        }
        canvas = fallbackCanvas
      }

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `the-miilk-pdf-summary-${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataUrl
      link.click()
      setShareStatus({ type: 'success', message: '전체 요약 이미지가 저장되었습니다.' })
    } catch (caught) {
      console.error('전체 요약 이미지 저장 실패:', caught)
      setShareStatus({
        type: 'error',
        message: caught instanceof Error
          ? caught.message
          : '이미지 생성에 실패했습니다. 브라우저 저장 권한과 메모리 상태를 확인해 주세요.',
      })
    } finally {
      captureNode?.remove()
      setIsSavingImage(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">
              <span className="h-px w-5 bg-cyan-600" /> THE MIILK · Internal Briefing
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[30px]">TheMiilk PDF Summary Assistant</h1>
            <p className="mt-1.5 text-sm text-slate-500">PDF의 맥락을 정제하고, 제목과 직접 연결되는 요약 문장 2개로 정리합니다.</p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
            {isProcessing ? <Loader2 className="size-4 animate-spin text-cyan-600" /> :
              status === 'completed' ? <CheckCircle2 className="size-4 text-emerald-600" /> :
              status === 'error' ? <AlertCircle className="size-4 text-rose-600" /> :
              <ShieldCheck className="size-4 text-slate-400" />}
            {statusLabel}
          </div>
        </header>

        <section className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <FileDropzone onFilesSelected={handleFilesSelected} disabled={isProcessing} />
            <SelectedFileList files={files} disabled={!files.length || isProcessing} isProcessing={isProcessing} onCreateSummaries={handleCreateSummaries} onMoveFile={handleMoveFile} />
            {error && <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}

            {debugItems.length > 0 && (
              <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between p-3 text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-2"><FileSearch className="size-4 text-cyan-700" />정제 원문 미리보기</span>
                  <span className="text-slate-400 group-open:hidden">열기</span>
                </summary>
                <div className="max-h-64 space-y-3 overflow-auto border-t border-slate-100 p-3">
                  {debugItems.map((item) => (
                    <div key={item.fileName}>
                      <p className="mb-1 truncate text-[11px] font-bold text-slate-700">{item.fileName}</p>
                      <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-2.5 font-mono text-[10px] leading-4 text-slate-300">{item.text.slice(0, 1800)}</pre>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </aside>

          <section className="min-h-[500px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold">파일별 핵심 요약</h2>
                <p className="mt-1 text-xs text-slate-500">제목을 설명하는 요약 문장 2개만 표시합니다.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{summaries.length}건</span>
                {isEditingAll ? (
                  <>
                    <button type="button" onClick={cancelEditingAll} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                      <X className="size-3.5" />취소
                    </button>
                    <button type="button" onClick={saveEditingAll} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white hover:bg-cyan-700">
                      <Check className="size-3.5" />저장
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={!summaries.length} onClick={handleCopyAll} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                      <Copy className="size-3.5" />전체 복사
                    </button>
                    <button type="button" disabled={!summaries.length || isSavingImage} onClick={handleSaveAll} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-40">
                      {isSavingImage ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                      {isSavingImage ? '저장 중' : '전체 이미지 저장'}
                    </button>
                    <button type="button" disabled={!summaries.length} onClick={startEditingAll} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                      <Pencil className="size-3.5" />수정
                    </button>
                  </>
                )}
              </div>
            </div>

            {summaries.length ? (
              <>
                {shareStatus && (
                  <div role={shareStatus.type === 'error' ? 'alert' : 'status'} className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${shareStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {shareStatus.type === 'success' ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                    {shareStatus.message}
                  </div>
                )}
                <div className="w-full overflow-x-auto">
                <div ref={summaryPageRef} className="mx-auto w-[1080px] max-w-none bg-white p-3 sm:p-4">
                  <div className="mb-2 border-b-2 border-slate-900 pb-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-3">
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">PDF 파일 요약</h2>
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-cyan-700">THE MIILK PDF SUMMARY</span>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">AI 활용 요약 페이지</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(isEditingAll ? draftSummaries : summaries).map((summary) => (
                      <SummaryCard
                        key={summary.fileName}
                        summary={summary}
                        isEditing={isEditingAll}
                        drafts={summary.bullets}
                        onDraftChange={(bulletIndex, value) => updateDraft(summary.fileName, bulletIndex, value)}
                      />
                    ))}
                  </div>
                </div>
                </div>
                {isProcessing && <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-cyan-200 bg-cyan-50/50 p-4 text-sm text-cyan-800"><Loader2 className="size-4 animate-spin" />다음 파일을 분석하고 있습니다.</div>}
                <SelectionResults selections={selections} />
              </>
            ) : (
              <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
                <div className="mb-3 rounded-2xl bg-white p-3 shadow-sm"><FileText className="size-7 text-cyan-700" /></div>
                <p className="text-sm font-semibold text-slate-700">{isProcessing ? '문서 구조를 분석하고 있습니다' : '요약할 PDF를 선택해 주세요'}</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">긴 문서는 여러 구간으로 나누어 분석한 뒤, 전체 맥락을 다시 종합합니다.</p>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  )
}
