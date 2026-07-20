import { UploadCloud } from 'lucide-react'

export function FileDropzone({ disabled, onFilesSelected }: { disabled: boolean; onFilesSelected: (files: FileList) => void }) {
  return (
    <label className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-5 text-center shadow-sm transition ${disabled ? 'cursor-not-allowed border-slate-200 opacity-60' : 'border-cyan-200 hover:border-cyan-500 hover:bg-cyan-50/40'}`}>
      <div className="mb-2 rounded-xl bg-cyan-50 p-2"><UploadCloud className="size-6 text-cyan-700" /></div>
      <span className="text-sm font-bold text-slate-800">PDF 파일 업로드</span>
      <span className="mt-1 text-xs text-slate-500">여러 파일을 한 번에 선택할 수 있습니다</span>
      <input className="sr-only" type="file" accept="application/pdf,.pdf" multiple disabled={disabled} onChange={(event) => event.target.files && onFilesSelected(event.target.files)} />
    </label>
  )
}
