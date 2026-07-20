export type ProcessingState = 'idle' | 'extracting' | 'summarizing' | 'completed' | 'error'

export type SummaryContent = {
  bullets: string[]
  keywords: string[]
}

export type PdfSummary = SummaryContent & {
  fileName: string
}

export type SelectionDecision = '공유 추천' | '조건부 추천' | '제외'

export type SelectionPriority = '상' | '중' | '하'

export type MaterialSelection = {
  fileName: string
  decision: SelectionDecision
  rationale: string[]
  iitpImplications: string[]
  duplicateWith?: string
  duplicateReason?: string
  priority: SelectionPriority
}
