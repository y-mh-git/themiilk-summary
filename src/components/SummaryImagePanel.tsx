import { forwardRef } from 'react'
import { HighlightedText } from './HighlightedText'
import type { PdfSummary } from '../types'

type SummaryImagePanelProps = {
  summaries: PdfSummary[]
}

export const SummaryImagePanel = forwardRef<HTMLDivElement, SummaryImagePanelProps>(
  ({ summaries }, ref) => (
    <div ref={ref} className="bg-white p-7 text-slate-950" style={{ width: 720 }}>
      <div className="mb-5 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-700">
            THE MIILK PDF SUMMARY
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            AI 활용 요약 페이지
          </span>
        </div>
        <h2 className="mt-1 text-xl font-bold tracking-normal">PDF 파일 요약</h2>
      </div>

      <div className="space-y-4">
        {summaries.map((summary, index) => {
          const usedKeywords = new Set<string>()

          return (
            <div key={summary.fileName} className="min-w-0 rounded-md border border-slate-200 p-4">
              <div className="mb-3 flex min-w-0 items-start gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-slate-950 text-xs font-semibold leading-none text-white">
                  {index + 1}
                </span>
                <h3 className="min-w-0 break-words text-sm font-semibold leading-5 [overflow-wrap:anywhere]">
                  {summary.fileName}
                </h3>
              </div>
              <ul className="space-y-2 text-sm leading-6 text-slate-700">
                {summary.bullets.map((bullet) => (
                  <li key={bullet} className="flex min-w-0 gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                      <HighlightedText
                        text={bullet}
                        keywords={summary.keywords}
                        usedKeywords={usedKeywords}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  ),
)

SummaryImagePanel.displayName = 'SummaryImagePanel'
