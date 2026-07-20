import type { MaterialSelection, SelectionDecision, SelectionPriority } from '../types'

type SourceMaterial = {
  fileName: string
  text: string
}

const SELECTION_PROMPT = `업로드된 기사·보고서 중 정보통신기획평가원(IITP) 내부 직원, 특히 단장·팀장급까지 정보서비스로 공유할 가치가 있는 자료를 선별한다.

[핵심 판단 원칙]
1. 기업·주가·실적 기사라고 해서 자동으로 제외하지 말 것.
- 기사 표면이 IPO, 주가, 실적, 투자심리, 기업가치 평가를 다루더라도 본문에 AI·ICT 산업 구조 변화, 반도체·HBM·AI 인프라 시장 변화, 국가 경쟁력, 정책·R&D 시사점이 포함되어 있으면 공유 대상으로 판단한다.
- '주가 기사인지'보다 '산업적·정책적 시사점이 있는지'를 우선 판단한다.

2. 기업 사례도 IITP 업무에 참고 가능한 시사점이 있으면 포함할 것.
- AI·ICT 산업의 구조 변화
- AI 인프라·반도체·데이터센터·GPU·HBM 등 핵심 산업 동향
- 국가·기업의 AI 인재 양성 및 확보 전략
- AI 도입에 따른 조직·업무·생산성 변화
- 글로벌 기술 경쟁과 산업 생태계 변화
- 향후 정책, R&D 사업기획, 산업전략 수립에 참고 가능한 내용

3. IITP, 정부, 정책, R&D라는 단어가 직접 등장하지 않아도 기사 전체의 ICT 산업 방향, 기술 경쟁력, 투자 흐름, 인재·조직 변화 등 기관 업무에 활용 가능한 함의가 있으면 포함한다.

4. 동일·유사 주제 자료는 중복을 제거한다.
- 같은 기업, 행사, 기술, 이슈를 다룬 파일이 여러 개면 가장 대표성이 높고 정책·산업·기술 시사점이 풍부한 파일 1개를 우선 선택한다.
- 나머지는 새로운 정보나 차별화된 관점이 명확할 때만 포함한다.

5. CES, MWC, GTC 등 대형 ICT 행사는 산업 트렌드, 기술 키워드, 기업 전략, 정책적 함의가 있으면 포함한다.
- 같은 행사 관련 파일이 여러 개면 내부 정보서비스 목적상 산업·기술 방향성이 더 큰 자료를 우선한다.

[제외 우선 기준]
- 주가 등락이나 투자자 반응만 설명하고 산업적 시사점이 거의 없는 자료
- 기업 홍보, 행사 참가 팁, 마케팅·영업 전략에 치우친 자료
- 이미 선정된 파일과 핵심 주제·근거·시사점이 대부분 중복되는 자료
- IITP 직원의 정책·산업·기술 동향 파악에 실질적인 정보가 적은 자료

[출력]
각 파일마다 최종 판단은 반드시 "공유 추천", "조건부 추천", "제외" 중 하나로 작성한다.
판단 근거는 2~3문장, IITP 업무 관련 시사점은 1~2문장으로 작성한다.
중복 주제가 있으면 중복 대상 파일명을 표시하고, 조건부 추천 또는 제외는 이유를 구체적으로 설명한다.
제목보다 본문의 산업적·정책적 함의를 우선 분석한다.`

const INDUSTRY_KEYWORDS = [
  'AI', '인공지능', 'ICT', '반도체', 'HBM', 'GPU', '데이터센터', 'AI 인프라', '클라우드', '전력', '냉각',
  '첨단 패키징', '파운드리', '메모리', '낸드', 'D램', 'R&D', '정책', '국가 경쟁력', '기술 경쟁',
  '산업 생태계', '공급망', '인재', '조직', '생산성', '자동화', '디지털 전환', 'CES', 'MWC', 'GTC',
]

const MARKET_ONLY_KEYWORDS = ['주가', '투자자', '투자심리', '애널리스트', '목표가', 'IPO', '상장', '밸류에이션', '시가총액']
const PROMO_ONLY_KEYWORDS = ['참가 팁', '미팅 전략', '부스 운영', '마케팅', '영업 전략', '홍보']
const EVENT_KEYWORDS = ['CES', 'MWC', 'GTC']

export async function evaluateMaterialSelections(materials: SourceMaterial[]): Promise<MaterialSelection[]> {
  const endpoint = import.meta.env.VITE_SUMMARY_API_URL as string | undefined
  if (endpoint) {
    try {
      const remote = await callSelectionApi(endpoint, materials)
      if (remote.length === materials.length) return remote
    } catch (error) {
      console.warn('자료 선별 API 호출에 실패해 로컬 판단 기준으로 전환합니다.', error)
    }
  }

  return createLocalSelections(materials)
}

async function callSelectionApi(endpoint: string, materials: SourceMaterial[]) {
  const payload = {
    stage: 'selection',
    instruction: SELECTION_PROMPT,
    materials: materials.map((material) => ({
      fileName: material.fileName,
      text: material.text.slice(0, 9_000),
    })),
    responseFormat: {
      selections: [{
        fileName: 'string',
        decision: '공유 추천 | 조건부 추천 | 제외',
        rationale: ['string'],
        iitpImplications: ['string'],
        duplicateWith: 'string | undefined',
        duplicateReason: 'string | undefined',
        priority: '상 | 중 | 하',
      }],
    },
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`자료 선별 API 오류 (${response.status})`)
  const data = (await response.json()) as { selections?: MaterialSelection[] }
  return normalizeSelections(data.selections ?? [], materials)
}

function normalizeSelections(selections: MaterialSelection[], materials: SourceMaterial[]) {
  const byName = new Map(selections.map((selection) => [selection.fileName, selection]))
  return materials.map((material) => {
    const found = byName.get(material.fileName)
    if (!found) return createSelection(material, '조건부 추천', '중')
    return {
      fileName: material.fileName,
      decision: normalizeDecision(found.decision),
      rationale: normalizeSentences(found.rationale, 3),
      iitpImplications: normalizeSentences(found.iitpImplications, 2),
      duplicateWith: found.duplicateWith,
      duplicateReason: found.duplicateReason,
      priority: normalizePriority(found.priority),
    }
  })
}

function createLocalSelections(materials: SourceMaterial[]) {
  const baseSelections = materials.map((material) => {
    const text = `${material.fileName}\n${material.text}`
    const industryScore = countMatches(text, INDUSTRY_KEYWORDS)
    const marketScore = countMatches(text, MARKET_ONLY_KEYWORDS)
    const promoScore = countMatches(text, PROMO_ONLY_KEYWORDS)
    const eventScore = countMatches(text, EVENT_KEYWORDS)

    let decision: SelectionDecision = '조건부 추천'
    let priority: SelectionPriority = '중'

    if (industryScore >= 4 || eventScore > 0) {
      decision = '공유 추천'
      priority = industryScore >= 7 || eventScore > 0 ? '상' : '중'
    } else if (industryScore >= 2) {
      decision = '조건부 추천'
      priority = '중'
    } else if (marketScore >= 2 || promoScore >= 1) {
      decision = '제외'
      priority = '하'
    } else {
      decision = '조건부 추천'
      priority = '하'
    }

    const selection = createSelection(material, decision, priority)
    selection.rationale = createRationale(industryScore, marketScore, promoScore, eventScore, decision)
    selection.iitpImplications = createImplications(industryScore, eventScore, decision)
    return selection
  })

  return applyDuplicateJudgement(baseSelections, materials)
}

function createSelection(material: SourceMaterial, decision: SelectionDecision, priority: SelectionPriority): MaterialSelection {
  return {
    fileName: material.fileName,
    decision,
    priority,
    rationale: ['본문의 산업·기술·정책적 시사점을 기준으로 공유 적합성을 판단했습니다.'],
    iitpImplications: ['IITP 내부 정보서비스 관점에서 기술·산업 동향 파악에 참고 가능한지 검토했습니다.'],
  }
}

function createRationale(
  industryScore: number,
  marketScore: number,
  promoScore: number,
  eventScore: number,
  decision: SelectionDecision,
) {
  if (decision === '공유 추천') {
    const eventText = eventScore > 0 ? '대형 ICT 행사 관련 자료로 산업 트렌드와 기업 전략을 함께 파악할 수 있습니다.' : '본문에 AI·ICT 산업 구조 변화와 핵심 기술 동향이 포함되어 있습니다.'
    return [
      eventText,
      '기업·투자 이슈가 포함되어 있더라도 산업 방향성, 기술 경쟁, 인프라 변화 등 내부 공유 가치가 있는 내용을 우선 반영했습니다.',
    ]
  }
  if (decision === '조건부 추천') {
    return [
      '본문에서 일부 산업적 시사점은 확인되지만 대표 자료로 공유하기에는 정책·기술 함의가 제한적일 수 있습니다.',
      '동일 주제의 더 대표성 높은 자료가 없다면 보완 자료로 검토할 수 있습니다.',
    ]
  }
  const reason = promoScore > 0
    ? '행사 참가·마케팅·영업 전략 성격이 강해 내부 정책·산업 동향 정보로서의 활용도가 낮습니다.'
    : marketScore > industryScore
      ? '주가, 투자심리, 기업가치 평가 중심 내용이 많고 산업적 시사점은 상대적으로 제한적입니다.'
      : 'IITP 직원의 정책·산업·기술 동향 파악에 직접 활용할 만한 정보가 제한적입니다.'
  return [reason, '다른 파일에서 같은 주제의 산업·기술 방향성을 더 풍부하게 다룬다면 그 자료를 우선 공유하는 편이 적절합니다.']
}

function createImplications(industryScore: number, eventScore: number, decision: SelectionDecision) {
  if (decision === '제외') {
    return ['정책·R&D 사업기획이나 ICT 산업전략 수립에 연결되는 함의가 약해 내부 정보서비스 우선순위는 낮습니다.']
  }
  if (eventScore > 0) {
    return ['대형 ICT 행사의 기술 키워드와 기업 전략을 통해 향후 산업 트렌드와 정책·R&D 검토 방향을 파악하는 데 참고 가능합니다.']
  }
  if (industryScore >= 4) {
    return ['AI·ICT 핵심 산업의 투자 흐름, 기술 경쟁력, 인프라 변화 등을 파악해 정책·R&D 기획 참고자료로 활용할 수 있습니다.']
  }
  return ['산업 동향 보조자료로 활용 가능하나, 정책·R&D 시사점은 다른 자료와 함께 교차 검토하는 편이 적절합니다.']
}

function applyDuplicateJudgement(selections: MaterialSelection[], materials: SourceMaterial[]) {
  const topicMap = new Map<string, number>()
  return selections.map((selection, index) => {
    const signature = createTopicSignature(materials[index])
    const previousIndex = topicMap.get(signature)
    if (signature && previousIndex !== undefined) {
      const previous = selections[previousIndex]
      if (selection.decision === '공유 추천') selection.decision = '조건부 추천'
      selection.priority = selection.priority === '상' ? '중' : '하'
      selection.duplicateWith = previous.fileName
      selection.duplicateReason = '동일·유사 주제의 자료가 이미 있어 대표성이 높은 자료를 우선 검토해야 합니다.'
      selection.rationale = [
        ...selection.rationale.slice(0, 1),
        `${previous.fileName}와 핵심 주제·근거가 유사해 중복 검토가 필요합니다. 새로운 관점이나 추가 정보가 명확할 때만 함께 공유하는 것이 적절합니다.`,
      ]
    } else if (signature) {
      topicMap.set(signature, index)
    }
    return selection
  })
}

function createTopicSignature(material: SourceMaterial) {
  const text = `${material.fileName}\n${material.text.slice(0, 3_000)}`.toLowerCase()
  const events = EVENT_KEYWORDS.find((keyword) => text.includes(keyword.toLowerCase()))
  if (events) return `event:${events.toLowerCase()}`

  const matched = INDUSTRY_KEYWORDS
    .filter((keyword) => text.includes(keyword.toLowerCase()))
    .slice(0, 3)
    .join('|')
  return matched || material.fileName.replace(/\.[^.]+$/, '').slice(0, 18)
}

function countMatches(text: string, keywords: string[]) {
  const lower = text.toLowerCase()
  return keywords.reduce((count, keyword) => count + (lower.includes(keyword.toLowerCase()) ? 1 : 0), 0)
}

function normalizeDecision(value: string): SelectionDecision {
  if (value === '공유 추천' || value === '포함') return '공유 추천'
  if (value === '제외') return '제외'
  return '조건부 추천'
}

function normalizePriority(value: string): SelectionPriority {
  if (value === '상' || value === '하') return value
  return '중'
}

function normalizeSentences(items: string[] | undefined, max: number) {
  const normalized = (items ?? [])
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, max)
  return normalized.length ? normalized : ['본문의 산업·정책적 시사점을 기준으로 판단했습니다.']
}
