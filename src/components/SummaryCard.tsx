import { getDisplayFileName } from '../lib/filename'
import type { PdfSummary } from '../types'

type SummaryCardProps = {
  summary: PdfSummary
  isEditing: boolean
  drafts: string[]
  onDraftChange: (bulletIndex: number, value: string) => void
  onDownloadPdf: () => void
}

export function SummaryCard({ summary, isEditing, drafts, onDraftChange, onDownloadPdf }: SummaryCardProps) {
  const displayName = getDisplayFileName(summary.fileName)
  const compactTitle = displayName.length > 72

  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 min-w-0">
        <h3
          className={`block w-full truncate whitespace-nowrap font-sans font-bold tracking-[-0.01em] text-slate-900 ${compactTitle ? 'text-[13px] leading-5' : 'text-[15px] leading-5'}`}
        >
          <button
            type="button"
            onClick={onDownloadPdf}
            title={`${displayName} — 원본 PDF 다운로드`}
            aria-label={`${displayName} 원본 PDF 다운로드`}
            className="block w-full cursor-pointer truncate text-left [font:inherit] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
          >
            {displayName}
          </button>
        </h3>
      </div>
      <div className="border-t border-slate-100 pt-2">
        {isEditing ? (
          <div className="space-y-1">
            {drafts.slice(0, 2).map((draft, index) => (
              <label key={index} className="flex gap-1.5">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-cyan-600" />
                <div className="min-w-0 flex-1">
                  <textarea
                    value={draft}
                    rows={2}
                    maxLength={300}
                    onChange={(event) => onDraftChange(index, event.target.value)}
                    aria-label={`${displayName} 요약 ${index + 1} 수정`}
                    className="min-h-12 w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm leading-5 text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </label>
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {summary.bullets.slice(0, 2).map((bullet, index) => (
              <li key={`${index}-${bullet}`} className="flex min-w-0 gap-1.5 text-[15px] leading-5 text-slate-700">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-cyan-600" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  {bullet}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
