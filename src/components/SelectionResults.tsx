import type { MaterialSelection, SelectionDecision } from '../types'
import { getDisplayFileName } from '../lib/filename'

type SelectionResultsProps = {
  selections: MaterialSelection[]
}

const decisionClassName: Record<SelectionDecision, string> = {
  '공유 추천': 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  '조건부 추천': 'bg-amber-50 text-amber-700 ring-amber-100',
  제외: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function SelectionResults({ selections }: SelectionResultsProps) {
  if (!selections.length) return null

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">공유 적합성 분석</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            내부 검토용 자료 선별 결과입니다. 이 영역은 전체 이미지 저장 대상에 포함되지 않습니다.
          </p>
        </div>
        <span className="w-fit rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {selections.length}건 분석
        </span>
      </div>

      <div className="space-y-2">
        {selections.map((selection) => (
          <article key={selection.fileName} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-bold text-slate-900" title={getDisplayFileName(selection.fileName)}>
                  {getDisplayFileName(selection.fileName)}
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${decisionClassName[selection.decision]}`}>
                    {selection.decision}
                  </span>
                  <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                    우선순위 {selection.priority}
                  </span>
                  {selection.duplicateWith && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600 ring-1 ring-rose-100">
                      중복 검토
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 text-xs leading-5 text-slate-600 lg:grid-cols-2">
              <div>
                <p className="mb-1 font-bold text-slate-700">판단 근거</p>
                <ul className="space-y-1">
                  {selection.rationale.map((reason) => (
                    <li key={reason} className="flex gap-1.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-700">IITP 업무 관련 시사점</p>
                <ul className="space-y-1">
                  {selection.iitpImplications.map((implication) => (
                    <li key={implication} className="flex gap-1.5">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-cyan-600" />
                      <span>{implication}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] leading-4 text-slate-500">
                  중복 여부: {selection.duplicateWith ? getDisplayFileName(selection.duplicateWith) : '해당 없음'}
                  {selection.duplicateWith && selection.duplicateReason ? ` · ${selection.duplicateReason}` : ''}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
