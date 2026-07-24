import { ArrowDown, ArrowUp, FileText, Loader2, Sparkles } from 'lucide-react'

export function SelectedFileList({ disabled, files, isProcessing, onCreateSummaries, onMoveFile }: {
  disabled: boolean; files: File[]; isProcessing: boolean; onCreateSummaries: () => void; onMoveFile: (fromIndex: number, toIndex: number) => void
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold">선택된 파일 <span className="ml-1 text-cyan-700">{files.length}</span></h2>
        <button type="button" disabled={disabled} onClick={onCreateSummaries} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
          {isProcessing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {isProcessing ? '분석 중' : '요약 생성'}
        </button>
      </div>
      {files.length ? (
        <ul className="max-h-40 space-y-1.5 overflow-auto">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">{index + 1}</span>
              <FileText className="size-3.5 shrink-0 text-cyan-700" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{file.name}</span>
              <span className="shrink-0 text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={isProcessing || index === 0}
                  onClick={() => onMoveFile(index, index - 1)}
                  aria-label={`${file.name} 위로 이동`}
                  className="inline-flex size-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isProcessing || index === files.length - 1}
                  onClick={() => onMoveFile(index, index + 1)}
                  aria-label={`${file.name} 아래로 이동`}
                  className="inline-flex size-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-lg bg-slate-50 py-4 text-center text-xs text-slate-400">아직 선택된 파일이 없습니다.</p>}
    </section>
  )
}
