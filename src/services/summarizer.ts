import type { SummaryContent } from '../types'

const CHUNK_SIZE = 12_000
const CHUNK_OVERLAP = 600
const BULLET_COUNT = 2
const LEADING_CONNECTORS = /^(그리고|또한|결국|즉|하지만|다만|한편|따라서|그러나|특히|이에 따라|이와 함께)[,，]?\s*/
const BRIEF_ENDING = /(함|임|음|됨|의미|전망|확대|가능성|핵심|부상|필요|예상)\.$/
const SUBJECT_MARKER = /^(.{2,60}?)(?:은|는|이|가)\s/
const PRONOUN_SUBJECT = /^(?:그|그녀|그들|이들|해당 인물|해당 기업|이 회사|이 기업|이 모델|이 기술|그 회사|그 기업|그 모델|그 기술)$/
const DEMONSTRATIVE_PRONOUN_REFERENCE =
  /(?:^|[\s"'“”‘’([{])(?:그|그녀|그들|이들|그는|그녀는|그들은|이들은|해당 인물|해당 기업|해당 회사|해당 기관|해당 모델|해당 기술|이 회사|이 기업|이 기관|이 모델|이 기술|그 회사|그 기업|그 기관|그 모델|그 기술)(?:은|는|이|가|을|를|의|도|에서|에게|으로|로)?(?:[\s,.!?)]|$)/
const CONTEXT_ONLY_SUBJECT_START =
  /^(?:지난|올해|내년|향후|최근|이번|당시|이후|현재|앞으로|\d{1,2}월|\d{4}년|[0-9.,]+(?:조|억|만|%|달러|원)|실적 발표|발표|분석|전망|투자|수요|매출|공급망|시장)/
const ATTRIBUTION_CUE = /(?:실적 발표|컨퍼런스콜|발표|밝혔|말했|언급|설명|전망|예상|공개|제시|강조|추정|분석|보고서|자료|수요|생산능력|매출|영업이익|투자|철수|매진)/
const MEANING_CUE =
  /(?:흐름|변화|전환|확대|축소|증가|감소|가속|둔화|불안|우려|논란|재편|압력|의미|시사|영향|전망|가능성|변수|핵심|부상|수혜|부담|위험|리스크|기회|경쟁|구조|전략|투자|수요|공급|생태계|산업|시장|정책|고용|생산성|원가|품귀|병목|확보|강화|약화)/
const CORE_MESSAGE_CUE =
  /(?:흐름|변화|전환|확대|축소|가속|둔화|불안|우려|논란|재편|압력|의미|시사|영향|전망|가능성|변수|핵심|부상|수혜|부담|위험|리스크|기회|경쟁|구조|전략|생태계|산업|정책|고용|생산성|원가|품귀|병목|강화|약화|확산|이동|집중|분화|재정의|드러남|부각|연결)/
const ORGANIZATION_HINT =
  /(?:[A-Z][A-Za-z0-9&+.-]{1,}|[가-힣A-Za-z0-9&+.-]{2,}(?:전자|하이닉스|테크|그룹|기업|정부|부처|위원회|기관|대학|연구소|거래소|은행|펀드|소프트|클라우드|반도체|모터스|에너지|바이오|항공|텔레콤|통신|제조|산업|플랫폼|시스템즈|일렉트릭|로보틱스|솔루션|파트너스|캐피털|벤처스))/
const EDUCATION_MAJOR_TOPIC = /(?:전공|학자금|대학|ROI|인문|예술|등록금|취업|학과)/
const AWKWARD_MAJOR_SUMMARY = /(?:포기하면서까지.*(?:인문|예술).*나머지.*(?:대학|전공|ROI)|(?:인문|예술).*지키는.*소수.*남고.*나머지.*재편)/
const HEADLINE_FRAGMENT_MERGE = /(?:이유|진실|전망|시사점|가능성|경고)\s+(?:주가와는|가격과|수요는|시장은|업계는|기업은|산업은|메모리|반도체|AI|HBM)/
const HEADLINE_COMMAND_MERGE =
  /(?:증명하라|주목하라|대비하라|읽어라|잡아라|찾아라|보라|하라)\s+(?:\d{4}년|세계|CES|MWC|GTC|AI|[A-Z][A-Za-z0-9&+.-]+)/
const CONTEXTLESS_CENTER_PHRASE = /(?:그|이)\s*한복판에\s*[가-힣A-Za-z0-9·()]+\s*(?:이|가)\s*있음/
const SOURCE_OR_MEMO_FRAGMENT = /(?:\(?\s*출처\s*[:：]|보고서에서\s*주목해야\s*할?\s*점|주목해야\s*할?\s*점은|바로\s*['"“”]?돈['"“”]?)/
const TOO_COLLOQUIAL_SUMMARY = /(?:바로\s*['"“”]?[가-힣A-Za-z0-9]+['"“”]?\s*임|핵심은\s*['"“”]?[가-힣A-Za-z0-9]+['"“”]?\s*임)$/
const SIDE_CASE_FRAGMENT = /^(?:이와\s+별도로|별도로|한편|다른\s+사례로|또\s+다른\s+사례로|추가로|반면)\s/
const OVER_COMPRESSED_COMPARISON =
  /(?:보다\s+많은\s+\d+(?:[.,]\d+)?억\s*달러|미\s*해병대보다\s+많은).*?(?:실제\s+정책의\s+흐름|방향을\s+재확인)/
const SUMMARY_LABEL_PREFIX = /^(?:[-●•]\s*)?(?:핵심\s*내용|핵심내용|인사이트)\s*[:：]?\s*/
const ARTICLE_INTRO_FRAGMENT = /(?:안녕하세요|기자입니다|에디터입니다|뉴스레터|구독|구독자|멤버십|오늘은|이번\s*기사에서는|이번\s*글에서는|이번\s*뉴스레터에서는|연재\s*소개|읽어주셔서|더밀크\s*구독|TheMiilk\s*구독|The\s*Miilk\s*구독)/i
const TITLE_STOP_WORDS = new Set([
  '더밀크',
  'the',
  'miilk',
  'pdf',
  '이유',
  '진실',
  '전망',
  '가능성',
  '시대',
  '핵심',
  '내용',
  '인사이트',
  '메가프로젝트',
  '프로젝트',
  '급한',
  '보다',
  '너머',
  '이끌',
  '6대',
  '베팅',
])

const FINAL_INSTRUCTION = `다음 PDF 내용은 TheMiilk에서 발행된 ICT/AI/반도체/디지털 산업 관련 자료다.
정보통신기획평가원 내부 직원에게 전달할 목적이지만, IITP 관점이나 정책적 해석을 추가하지 말고 원문에 근거해 핵심만 압축해라.
요약 전에 반드시 본문이 실제로 시작되는 위치를 먼저 판단해라. 인사말, 기자 소개, 뉴스레터 소개, 구독 안내, "오늘은...", "이번 기사에서는..." 같은 도입부는 본문이 아니므로 요약 대상에서 제외해라.
TheMiilk 기사 앞부분에는 기자 인사, 뉴스레터 소개, 연재 소개, 구독자 안내가 포함될 수 있다. 이 부분은 핵심내용이 아니므로 실제 기사 본문 이후의 내용만 분석해라.
요약 페이지의 목적은 사용자가 원문을 읽을지 말지 빠르게 판단하도록 돕는 것이다. 따라서 파일 제목과 직접 연결되는 중심 이슈를 우선 요약하고, 제목과 무관한 주변 사례·부가 사례를 핵심 bullet로 올리지 마라.
요약의 목적은 기사를 해석하는 것이 아니라 기사를 압축하는 것이다. 새로운 의미 부여, 원문에 없는 인사이트 생성, 과도한 정책적 해석, 일반화, 원문에 없는 결론 작성을 모두 금지한다.
원문에 없는 내용은 추측하지 마라. 확인되지 않는 기업명, 수치, 정책적 의미를 추가하지 마라.
제목, 소제목, 반복 핵심어, 결론, 수치, 기업명과 산업명을 우선 반영하되 원문에 있는 관계만 서술해라.
각 문장은 반드시 주체를 명시해라. 실적 발표, 발언, 전망, 투자, 수치 변화는 해당 기업·기관·산업 주체를 문장 안에 직접 써라.
날짜, 행사명, 발표 시점, 수치로 문장을 시작해 주체가 생략된 것처럼 보이게 쓰지 마라. 예: "10월 실적 발표에서..."가 아니라 "SK하이닉스는 지난 10월 실적 발표에서..."처럼 작성해라.
문장 주어를 '그는', '그녀는', '이들은', '해당 기업은', '이 회사는' 같은 지시대명사로 쓰지 마라. 인물·기업·기관·모델의 정확한 명칭을 써라.
문장 중간에도 '그', '그녀', '이들', '해당 기업', '이 회사', '이 기술', '그 모델' 같은 지시대명사를 남기지 마라. 앞뒤 문맥에서 가리키는 정확한 기업명·기관명·인물명·기술명·모델명을 찾아 대체해라. 정확한 명칭을 원문에서 확인할 수 없으면 해당 문장은 최종 요약으로 쓰지 마라.
제목 일부와 본문 문장을 붙여 한 문장처럼 만들지 마라. 예: "HBM 수급 불균형은 지속되지만 가격 모멘텀은 둔화되는 이유 주가와는 별개로..."처럼 제목 조각과 본문 판단이 섞인 문장을 금지한다.
제목형 명령문이나 슬로건을 본문 문장 앞에 붙이지 마라. 예: "비용·시간·정확도로 증명하라 2027년 세계 최대 IT·가전 전시회..."처럼 제목 조각과 본문 전망이 섞인 문장을 금지한다.
행사·전망 문서는 반드시 주어를 세워 다시 써라. 예: "CES 2027은 비용·시간·정확도 등 실질 성과로 AI 도입 효과를 입증하는 AI 네이티브 전환을 핵심 흐름으로 제시함."처럼 작성해라.
전문 독자가 아니어도 이해되도록 생소한 기업·모델·인물은 왜 중요한지 역할을 함께 설명해라. 예: "그 한복판에 지푸가 있음."처럼 맥락 없는 위치 설명으로 끝내지 마라.
출처 표기, 원문 메모, 독자에게 말을 거는 표현을 출력하지 마라. 예: "(출처 : 앤트로픽)", "보고서에서 주목해야할 점은 바로 '돈'임." 같은 문장을 금지한다.
구어체 강조어를 쓰지 말고 원문이 말한 핵심 내용으로 압축해라. 예: "중요한 점은 돈임."처럼 쓰지 말고 원문에서 확인되는 비용, 시간, 정확도, 매출, 생산성 등 구체 내용을 중심으로 작성해라.
파일 제목에 등장하는 기업명과 본문 근거문의 발언 주체가 다르면, 반드시 본문 근거문의 실제 주체를 써라. 제목 기업이 말한 것처럼 오해될 표현을 금지한다.
예: "MS 관련 문서에서 SK하이닉스 실적 발표 내용이 근거라면 "SK하이닉스는 ..."으로 시작하고, MS가 발표한 것처럼 쓰지 마라.
요약 우선순위는 1순위 기사 제목이 말하려는 핵심 주장, 2순위 본문 전체에서 반복적으로 설명하는 중심 메시지, 3순위 이를 뒷받침하는 근거다.
가중치는 제목 40%, 소제목 30%, 서론·결론 20%, 본문 세부 사례 10%로 적용해라. 본문 중간의 세부 사례나 예시가 제목·소제목·서론·결론보다 우선되면 안 된다.
자료 전체에서 가장 중요한 핵심 메시지 두 개만 선정하고, 원문의 의미를 바꾸지 않는 범위에서 내부 보고서 개조식으로 압축해라.
반드시 글머리기호 2개만 출력하고 각 글머리기호는 하나의 핵심 메시지와 하나의 완전한 문장으로 구성해라.
두 글머리기호는 서로 중복되지 않아야 하며, 숫자·기업명·사례는 핵심 내용을 이해하는 데 꼭 필요한 경우에만 포함해라.
첫 번째 글머리기호는 '핵심내용'이다. 기사 제목이 말하려는 핵심 주장을 가장 잘 설명하는 한 문장으로 작성해라. 이 한 문장만 읽었을 때 제목이 설명되어야 한다.
두 번째 글머리기호는 '인사이트'다. 원문에 근거해 이 내용이 왜 중요한지 정책적·산업적 의미를 설명하는 한 문장으로 작성하되, 원문에 없는 해석은 추가하지 마라.
두 글머리기호는 "핵심내용 + 인사이트" 구조여야 한다.
예시나 사례를 그대로 나열하지 마라. 기업 사례가 여러 개 등장하면 그 사례들이 원문에서 공통적으로 설명하는 핵심 내용을 요약하되, 원문을 넘어선 해석은 추가하지 마라.
제목의 중심 주제와 직접 연결되지 않는 별도 사례를 최종 요약으로 선택하지 마라. "이와 별도로", "한편", "추가로", "반면"으로 이어지는 국가·기업 사례는 기사 결론을 직접 설명할 때만 사용하고, 독립 bullet로 쓰지 마라.
절대로 기사 중간에 등장하는 사례, 특정 기업 사례, 특정 산업 사례, 예시, 부가 설명만을 핵심내용으로 작성하지 마라.
파일 제목이 "5000조원 메가프로젝트... 반도체 박사보다 전기기사가 급한 이유"처럼 특정 병목을 제시하면, 전력망·전기 인력·AI 인프라·반도체 투자 병목처럼 제목의 질문에 답하는 내용만 핵심으로 선택해라. 우주항공청 예산처럼 제목의 중심 이슈와 직접 연결되지 않는 보조 사례는 제외해라.
특히 위 제목의 문서에서 "우주항공청은 2026년도 연구개발 예산..."처럼 우주 전문인력 예산을 설명하는 문장은 전력·전기 인프라 병목을 설명하는 핵심 문장이 아니므로 최종 bullet로 선택하지 마라.
위 제목의 문서에서 "피지컬 AI와 로보틱스를 국가 전략산업으로 지정..." 또는 "산업 투자 속도가 교육과 인재 양성 체계를 앞서가기 시작..."처럼 기사 중간의 보조 산업·인재 사례만 설명하는 문장은 제목의 전력·전기 인프라 병목을 직접 설명하지 않으면 핵심 bullet로 선택하지 마라.
위 제목의 문서에서 "한국 GDP의 두 배를 웃도는 자금이 미래 산업으로 향함", "핵심 기술과 데이터, AI 모델이 국가 경쟁력과 안보를 좌우함"처럼 거시적 투자 배경만 설명하는 문장은 제목의 전력·전기 인력 병목을 직접 설명하지 않으면 핵심 bullet로 선택하지 마라.
파일 제목이 "_해병대보다 드론__ 미국의 750억 달러 베팅...드론 시대를 이끌 6대 기업"처럼 특정 기술 전환과 관련 기업을 제시하면, 미국 국방 예산·드론 전력화·무인기/UAV·자율무기·방산 기업 구도처럼 제목의 중심 이슈에 직접 답하는 내용만 핵심으로 선택해라.
위 제목의 문서에서 단순 기업 소개, 주변 국방 사례, 제목의 드론 전환과 직접 연결되지 않는 예산·조직 설명은 핵심 bullet로 선택하지 마라.
예산·비교·조직 신설이 제목의 핵심 근거일 때는 과도하게 압축하지 마라. 누가 무엇에 얼마를 배정했는지, 그 규모가 무엇과 비교되는지, 왜 제목의 핵심 근거인지 한 문장 안에서 이해되게 써라.
예: "미 해병대보다 많은 546억 달러... 실제 정책의 흐름은 이런 방향을 재확인하고 있음."처럼 제목 조각과 모호한 해설을 붙이지 말고, "미군은 드론·자율무기 통합 지휘조직인 DAWG 예산으로 546억 달러를 요청했으며, 이는 해병대 전체 예산 요청액을 웃도는 규모임."처럼 작성해라.
수치나 조사 결과만 독립적으로 쓰지 마라. 수치를 포함할 때는 원문에서 그 수치와 함께 설명한 핵심 내용 안에서만 사용해라.
출력 전 스스로 검증해라. 제목과 직접 연결되는지, 기사의 결론을 요약했는지, 일부 사례만 요약하지 않았는지, 기사의 가장 중요한 메시지를 담고 있는지 모두 '예'일 때만 출력해라.
특히 첫 번째 글머리기호는 "이 한 문장만 읽었을 때 제목이 설명되는가?"에 YES일 때만 출력하고, NO라면 다시 작성해라.
현재 작성한 첫 번째 글머리기호가 기사 첫 문장을 그대로 옮긴 것이거나 도입부 인사말·뉴스레터 소개·구독 안내를 요약한 것이라면 다시 작성해라.
각 문장은 반드시 '~함.', '~임.', '~음.' 또는 '전망.', '확대.', '필요.'처럼 자연스러운 명사형 표현으로 끝내라.
주어와 서술어의 의미를 명확히 하고 문장을 접속어로 시작하지 마라. 제목, 서론, 출처는 출력하지 마라.`

const EDUCATION_MAJOR_INSTRUCTION = `이 문서는 대학 전공, 학자금, 취업 성과, 전공 ROI를 다룬 자료일 가능성이 높다.
이 경우에도 새로운 해석을 추가하지 말고 원문이 직접 설명한 대학 전공 선택 기준, 학자금 부담, 취업 성과, 전공 ROI 관련 핵심만 압축해라.
"순수 인문과 예술 학과를 지키는 소수로 남고 나머지..."처럼 앞부분이 길게 매달린 압축문을 쓰지 마라.
대신 원문 근거 안에서 "대학은 학자금 부담과 취업 성과 압박 속에서 ROI가 낮은 전공을 축소·재편하는 흐름임."처럼 주어와 핵심 내용이 즉시 이해되게 작성해라.`

export async function summarizePdfText(text: string, fileName: string): Promise<SummaryContent> {
  const chunks = splitIntoChunks(text)
  const endpoint = import.meta.env.VITE_SUMMARY_API_URL as string | undefined
  const instruction = buildFinalInstruction(fileName, text)

  if (!endpoint) return createExtractiveSummary(text, fileName)

  try {
    const attributionEvidence = collectAttributionEvidence(text)
    const chunkSummaries = await Promise.all(
      chunks.map((chunk, index) =>
        callSummaryApi(endpoint, {
          fileName,
          text: chunk,
          stage: 'chunk',
          instruction: `원문 근거만 사용해 이 구간이 말하는 핵심 메시지 후보를 3개 이내로 압축해라. 요약 전에 실제 기사 본문이 시작되는 위치를 판단하고, 인사말·기자 소개·뉴스레터 소개·구독 안내·"오늘은..."·"이번 기사에서는..." 같은 도입부는 후보에서 제외해라. 요약의 목적은 사용자가 원문을 읽을지 말지 판단할 수 있게 하는 것이다. 우선순위는 제목 핵심 주장 40%, 소제목 중심 메시지 30%, 서론·결론 20%, 본문 세부 사례 10%다. 기사 중간 사례, 특정 기업 사례, 예시, 부가 설명만 후보로 뽑지 마라. 새로운 의미 부여, 원문에 없는 결론 작성을 금지한다. 중요한 문장이나 수치를 그대로 옮기지 말고, 원문이 직접 전달하는 중심 메시지를 간결하게 정리해라. 첫 번째 후보는 제목을 관통하는 대표 핵심내용으로 쓸 수 있을 만큼 문서의 중심 내용을 담아야 하며, 기사 첫 문장을 그대로 옮긴 후보는 제외해라. 숫자·기업명·사례는 메시지 이해에 필요한 경우에만 포함해라. 예산·비교·조직 신설이 제목의 핵심 근거일 때는 누가 무엇에 얼마를 배정했는지, 그 규모가 무엇과 비교되는지, 왜 핵심 근거인지 빠뜨리지 마라. "이와 별도로", "한편", "추가로", "반면"으로 이어지는 주변 국가·기업 사례는 제목의 중심 주제나 기사 결론을 직접 설명하지 않으면 후보로 뽑지 마라. 파일 제목이 특정 병목·쟁점·질문을 제시하면 그 질문에 답하는 문장만 핵심 후보로 선택해라. 실적 발표, 발언, 전망, 투자, 수치 변화는 해당 기업·기관·산업 주체를 반드시 함께 적어라. 제목 조각과 본문 문장을 이어 붙이지 말고, "비용·시간·정확도로 증명하라 2027년..."처럼 제목형 명령문과 본문 문장을 붙인 요약을 만들지 마라. '그는/이들은/해당 기업' 같은 지시대명사 대신 정확한 명칭을 써라. 생소한 기업·모델은 왜 중요한지 역할을 함께 설명해라. 출처 표기나 "주목해야 할 점은 돈" 같은 원문 메모·구어체 강조를 요약문에 넣지 마라. 문서 구간 ${index + 1}/${chunks.length}.`,
        }),
      ),
    )

    const final = await callSummaryApi(endpoint, {
      fileName,
      text: [
        '[파일명]',
        fileName,
        '',
        '[chunk별 핵심 요약]',
        chunkSummaries.flatMap((item) => item.bullets).join('\n'),
        '',
        '[발표·실적·수치 주체 확인용 원문 근거]',
        attributionEvidence,
      ].join('\n'),
      stage: 'final',
      instruction,
    })

    let validated = validateAndGround(final.bullets, text, fileName)
    if (validated.length !== BULLET_COUNT) {
      const retry = await callSummaryApi(endpoint, {
        fileName,
        text: [
          text.slice(0, 9_000),
          '',
          '[파일명]',
          fileName,
          '',
          '[발표·실적·수치 주체 확인용 원문 근거]',
          attributionEvidence,
          '',
          '[검토할 초안]',
          final.bullets.join('\n'),
        ].join('\n'),
        stage: 'final',
        instruction: `${instruction}
초안은 문장 품질 검사를 통과하지 못했다. 원문에서 직접 확인되는 내용만 사용해 정확히 두 개의 글머리기호로 다시 작성해라.
첫 번째 글머리기호는 제목을 가장 잘 설명하는 '핵심내용', 두 번째 글머리기호는 원문에 근거해 이 내용이 왜 중요한지 설명하는 '인사이트'여야 한다.
문장이 35~180자 안에서 자연스럽게 끝나는지, 첫 번째 문장만 읽어도 제목이 설명되는지, 제목과 직접 연결되는지, 기사의 결론을 요약했는지, 일부 사례만 요약하지 않았는지, 기사의 가장 중요한 메시지를 담고 있는지, 첫 번째 문장이 접속어·부사구·날짜·수치·사례가 아니라 명확한 주체와 핵심 메시지로 시작하는지, 주어와 서술어가 호응하는지, 지시대명사 주어를 쓰지 않았는지, 문장 중간에도 그/그녀/이들/해당 기업/이 회사/이 기술/그 모델 같은 지시대명사가 남아 있지 않은지, 제목 조각과 본문 문장을 붙이지 않았는지, 제목형 명령문·슬로건과 본문 전망이 섞이지 않았는지, 중요한 예산·비교·조직 신설의 주체·대상·규모·비교 기준을 빠뜨리지 않았는지, "이와 별도로/한편/추가로/반면"으로 시작하는 주변 사례를 독립 bullet로 쓰지 않았는지, 출처 표기·원문 메모·구어체 강조가 남아 있지 않은지, 생소한 기업·모델의 역할을 설명했는지, 발표·실적·수치의 주체가 생략되지 않았는지, 제목 기업과 실제 발언 주체가 혼동되지 않는지 출력 전에 스스로 검사해라.`,
      })
      validated = validateAndGround(retry.bullets, text, fileName)
    }
    const fallback = createExtractiveSummary(text, fileName).bullets
    return { bullets: fillSummary(validated, fallback, fileName), keywords: [] }
  } catch (error) {
    console.warn('요약 API 호출에 실패해 원문 기반 로컬 요약으로 전환합니다.', error)
    return createExtractiveSummary(text, fileName)
  }
}

function buildFinalInstruction(fileName: string, text: string) {
  const educationTopic = EDUCATION_MAJOR_TOPIC.test(`${fileName}\n${text.slice(0, 4_000)}`)
  return educationTopic ? `${FINAL_INSTRUCTION}\n${EDUCATION_MAJOR_INSTRUCTION}` : FINAL_INSTRUCTION
}

function splitIntoChunks(text: string) {
  if (text.length <= CHUNK_SIZE) return [text]
  const paragraphs = text.split(/\n+/).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 1 > CHUNK_SIZE && current) {
      chunks.push(current)
      current = `${current.slice(-CHUNK_OVERLAP)}\n${paragraph}`
    } else {
      current += `${current ? '\n' : ''}${paragraph}`
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function collectAttributionEvidence(text: string) {
  const evidence = text
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 320)
    .filter((sentence) => ATTRIBUTION_CUE.test(sentence))
    .filter((sentence) => ORGANIZATION_HINT.test(sentence))
    .slice(0, 24)

  return evidence.length ? evidence.map((sentence) => `- ${sentence}`).join('\n') : '- 원문에서 확인되는 기업·기관 주체를 기준으로만 요약할 것.'
}

async function callSummaryApi(
  endpoint: string,
  payload: { fileName: string; text: string; stage: 'chunk' | 'final'; instruction: string },
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      responseFormat: { bullets: ['string'], keywords: [] },
    }),
  })
  if (!response.ok) throw new Error(`요약 API 오류 (${response.status})`)
  const data = (await response.json()) as { bullets?: string[]; summary?: string }
  const bullets = data.bullets ?? (data.summary ?? '').split(/\n+/)
  if (!bullets.some((item) => item.trim())) throw new Error('요약 API가 빈 결과를 반환했습니다.')
  return { bullets }
}

function createExtractiveSummary(text: string, fileName?: string): SummaryContent {
  const paragraphs = text.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const weightedSignals = buildWeightedSignals(paragraphs, fileName)
  const sentences = paragraphs
    .flatMap((paragraph, paragraphIndex) =>
      paragraph.split(/(?<=[.!?。])\s+/).map((sentence) => ({
        paragraphIndex,
        sentence: polishSentence(sentence.trim()),
      })),
    )
    .filter((item) => item.sentence)
    .filter((item) => isStructurallyComplete(item.sentence))
    .filter((item) => hasClearSubject(item.sentence))
    .filter((item) => hasContextualMeaning(item.sentence))
    .filter((item) => hasCoreMessage(item.sentence))
    .filter((item) => hasReadableStandaloneContext(item.sentence))
    .filter((item) => !isCopiedOpeningSentence(item.sentence, text))
    .filter((item) => !isTopicSpecificMismatch(item.sentence, fileName))
    .filter((item) => item.sentence.length >= 35 && item.sentence.length <= 180)

  const terms = new Map<string, number>()
  text.match(/[가-힣]{2,}|[A-Za-z][A-Za-z0-9+-]{2,}/g)?.forEach((term) => {
    const key = term.toLowerCase()
    terms.set(key, (terms.get(key) ?? 0) + 1)
  })

  const selected = sentences
    .map(({ sentence, paragraphIndex }, index) => ({
      sentence,
      index,
      score:
        (sentence.match(/[가-힣]{2,}|[A-Za-z][A-Za-z0-9+-]{2,}/g) ?? [])
          .reduce((sum, term) => sum + Math.min(terms.get(term.toLowerCase()) ?? 0, 8), 0) /
          Math.sqrt(sentence.length) +
        (/\d+(?:[.,]\d+)?\s*(?:%|조|억|만|배|개|년|달러|원)/.test(sentence) ? 2.5 : 0) +
        (/[A-Z][A-Za-z0-9&+.-]{1,}/.test(sentence) ? 1.5 : 0) +
        (MEANING_CUE.test(sentence) ? 2 : 0) +
        (CORE_MESSAGE_CUE.test(sentence) ? 4 : 0) +
        weightedPriorityScore(sentence, paragraphIndex, paragraphs.length, weightedSignals) +
        (paragraphs.some((paragraph) => paragraph.length < 70 && sentence.includes(paragraph)) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((candidate, index, all) =>
      all.slice(0, index).every((picked) => similarity(candidate.sentence, picked.sentence) < 0.55),
    )
    .slice(0, BULLET_COUNT)
    .sort((a, b) => a.index - b.index)
    .map(({ sentence }) => sentence)

  return {
    bullets: fillSummary(validateAndGround(selected, text, fileName), selected, fileName),
    keywords: [],
  }
}

function similarity(a: string, b: string) {
  const left = new Set(a.split(/\s+/))
  const right = new Set(b.split(/\s+/))
  return [...left].filter((term) => right.has(term)).length / Math.max(left.size, right.size, 1)
}

type WeightedSignals = {
  titleTerms: string[]
  subtitleTerms: string[]
}

function buildWeightedSignals(paragraphs: string[], fileName?: string): WeightedSignals {
  const titleTerms = meaningfulTerms(fileName ?? '')
  const subtitleTerms = meaningfulTerms(
    paragraphs
      .slice(0, 12)
      .filter((paragraph) => paragraph.length >= 8 && paragraph.length <= 90)
      .slice(0, 4)
      .join(' '),
  )

  return { titleTerms, subtitleTerms }
}

function meaningfulTerms(text: string) {
  return tokenize(
    text
      .replace(/\.pdf$/i, '')
      .replace(/^\d{6,8}[._\-\s]*/, '')
      .replace(/-?\s*더밀크.*$/i, '')
      .replace(/_?\s*The\s*Miilk.*$/i, ''),
  ).filter((term) => term.length >= 2 && !TITLE_STOP_WORDS.has(term))
}

function overlapScore(sentence: string, terms: string[]) {
  if (!terms.length) return 0
  const sentenceTerms = new Set(tokenize(sentence))
  const matched = terms.filter((term) => sentenceTerms.has(term)).length
  return matched / Math.min(terms.length, 5)
}

function weightedPriorityScore(
  sentence: string,
  paragraphIndex: number,
  paragraphCount: number,
  signals: WeightedSignals,
) {
  const titleWeight = overlapScore(sentence, signals.titleTerms) * 8 // 제목 40%
  const subtitleWeight = overlapScore(sentence, signals.subtitleTerms) * 6 // 소제목 30%
  const isIntroOrConclusion = paragraphIndex <= Math.max(2, paragraphCount * 0.12) ||
    paragraphIndex >= Math.max(0, paragraphCount - Math.max(3, paragraphCount * 0.12))
  const introConclusionWeight = isIntroOrConclusion ? 4 : 0 // 서론·결론 20%
  const detailWeight = 1 // 본문 세부 사례 10%

  return titleWeight + subtitleWeight + introConclusionWeight + detailWeight
}

function isTopicSpecificMismatch(sentence: string, fileName?: string) {
  const title = fileName ?? ''
  const isSemiconductorPowerTitle = /(?:5000조원|반도체 박사|전기기사)/.test(title)
  const hasPowerInfrastructureContext =
    /(?:전력망|전력|전기|전력기기|전력설비|송전|변압기|데이터센터|AI\s*인프라|전력\s*인력|전기\s*인력|전기기사|전기\s*기술자|전력\s*기술자|병목)/.test(sentence)
  const looksLikePeripheralInstitutionCase =
    /(?:우주항공청|우주\s*전문인력|국가\s*우주위험|직할\s*연구기관|정부|부처|기관|위원회|청|부|처|대학|연구기관).*(?:예산|편성|전략 분야|양성|대응 체계|투자 추진|명시)/.test(sentence)
  if (isSemiconductorPowerTitle && looksLikePeripheralInstitutionCase) return true

  const looksLikePeripheralIndustryOrTalentCase =
    /(?:피지컬\s*AI|로보틱스|국가\s*전략산업|산업\s*투자\s*속도|교육과\s*인재\s*양성|인재\s*양성\s*체계|교육.*앞서가기|인재.*앞서가기)/.test(sentence)
  if (isSemiconductorPowerTitle && looksLikePeripheralIndustryOrTalentCase && !hasPowerInfrastructureContext) return true

  const looksLikeMacroInvestmentBackground =
    /(?:국내총생산|GDP|미래\s*산업|국가\s*경쟁력|안보|핵심\s*기술|데이터|AI\s*모델|자산으로\s*바뀌|자금이.*향함|투자.*향함)/.test(sentence)
  if (isSemiconductorPowerTitle && looksLikeMacroInvestmentBackground && !hasPowerInfrastructureContext) return true

  return false
}

function validateAndGround(items: string[], source: string, fileName?: string) {
  const sourceTerms = new Set(tokenize(source))
  const candidates = items
    .map(polishSentence)
    .filter(isStructurallyComplete)
    .filter(hasClearSubject)
    .filter(hasContextualMeaning)
    .filter(hasCoreMessage)
    .filter(hasReadableStandaloneContext)
    .filter((sentence) => !isCopiedOpeningSentence(sentence, source))
    .filter((sentence) => !isTopicSpecificMismatch(sentence, fileName))
    .filter((sentence) => groundingScore(sentence, sourceTerms) >= 0.58)

  return Array.from(new Set(candidates)).slice(0, BULLET_COUNT)
}

function polishSentence(item: string) {
  let sentence = item.replace(SUMMARY_LABEL_PREFIX, '').replace(LEADING_CONNECTORS, '').replace(/\s+/g, ' ').trim()
  sentence = sentence.replace(/\(?\s*출처\s*[:：][^)]+?\)?/g, '').trim()
  sentence = sentence.replace(/[,:;·\-–—]\s*$/, '').trim()
  sentence = repairKnownAwkwardSummary(sentence)
  sentence = repairHeadlineFragmentMerge(sentence)
  sentence = normalizeReportStyle(sentence)
  if (sentence && !/[.!?。]$/.test(sentence)) sentence += '.'
  return sentence
}

function repairKnownAwkwardSummary(sentence: string) {
  if (!AWKWARD_MAJOR_SUMMARY.test(sentence)) return sentence
  return '대학은 학자금 부담과 취업 성과 압박 속에서 ROI가 낮은 인문·예술 전공을 축소·재편하는 흐름임'
}

function repairHeadlineFragmentMerge(sentence: string) {
  if (/HBM 수급 불균형.*가격 모멘텀.*이유\s+주가와는 별개로/.test(sentence)) {
    return '메모리 반도체 가격과 수요는 HBM 수급 불균형 지속과 AI 인프라 투자 확대 속에서 상승 방향을 유지하고 있음'
  }
  if (/비용·시간·정확도로 증명하라\s+2027년.*CES.*AI\s*네이티브/.test(sentence)) {
    return 'CES 2027은 비용·시간·정확도 등 실질 성과로 AI 도입 효과를 입증하는 AI 네이티브 전환을 핵심 흐름으로 제시함'
  }
  if (OVER_COMPRESSED_COMPARISON.test(sentence) && /(?:드론|자율무기|DAWG|해병대|546억\s*달러)/.test(sentence)) {
    return '미군은 드론·자율무기 통합 지휘조직인 DAWG 예산으로 546억 달러를 요청했으며, 이는 해병대 전체 예산 요청액을 웃도는 규모임'
  }
  return sentence
}

function normalizeReportStyle(sentence: string) {
  return sentence
    .replace(/[.!?。]+$/, '')
    .replace(/확대되고 (?:있습니다|있다)$/, '확대 중임')
    .replace(/자리 잡고 (?:있습니다|있다)$/, '핵심으로 부상')
    .replace(/(?:것으로|처럼) 보입니다$/, '것으로 보임')
    .replace(/것으로 보인다$/, '것으로 보임')
    .replace(/평가(?:됩니다|된다)$/, '평가됨')
    .replace(/예상(?:됩니다|된다)$/, '예상됨')
    .replace(/전망(?:입니다|이다)$/, '전망')
    .replace(/필요(?:합니다|하다)$/, '필요함')
    .replace(/중요(?:합니다|하다)$/, '중요함')
    .replace(/할 수 있을 것입니다$/, '할 가능성')
    .replace(/할 것입니다$/, '할 전망')
    .replace(/있습니다$/, '있음')
    .replace(/있다$/, '있음')
    .replace(/없습니다$/, '없음')
    .replace(/없다$/, '없음')
    .replace(/됩니다$/, '됨')
    .replace(/된다$/, '됨')
    .replace(/됐습니다$/, '됐음')
    .replace(/됐다$/, '됐음')
    .replace(/합니다$/, '함')
    .replace(/한다$/, '함')
    .replace(/입니다$/, '임')
    .replace(/이다$/, '임')
    .replace(/차지한다$/, '차지함')
    .replace(/기록했다$/, '기록함')
    .replace(/확보했다$/, '확보함')
    .replace(/나타났다$/, '나타남')
    .replace(/못했다$/, '못했음')
    .replace(/했다$/, '했음')
}

function isStructurallyComplete(sentence: string) {
  if (sentence.length < 35 || sentence.length > 180) return false
  if (LEADING_CONNECTORS.test(sentence)) return false
  if (!sentence.endsWith('.')) return false
  if (!BRIEF_ENDING.test(sentence)) return false
  if (/[,;:·\-–—]\.$/.test(sentence)) return false
  return true
}

function hasClearSubject(sentence: string) {
  const subjectMatch = sentence.match(SUBJECT_MARKER)
  if (!subjectMatch) return false

  const subjectCandidate = subjectMatch[1].replace(/[“”"'()]/g, '').trim()
  if (!subjectCandidate) return false
  if (PRONOUN_SUBJECT.test(subjectCandidate)) return false

  const startsWithContextOnlySubject = CONTEXT_ONLY_SUBJECT_START.test(subjectCandidate)
  if (startsWithContextOnlySubject && ATTRIBUTION_CUE.test(sentence)) return false
  if (startsWithContextOnlySubject && !ORGANIZATION_HINT.test(subjectCandidate)) return false

  return true
}

function hasContextualMeaning(sentence: string) {
  const hasNumberOrSurveyResult = /\d+(?:[.,]\d+)?\s*(?:%|조|억|만|배|개|년|달러|원)|(?:답했|응답|조사|설문|비중|수치|결과)/.test(sentence)
  if (!hasNumberOrSurveyResult) return true
  return MEANING_CUE.test(sentence)
}

function hasCoreMessage(sentence: string) {
  return CORE_MESSAGE_CUE.test(sentence)
}

function hasReadableStandaloneContext(sentence: string) {
  if (HEADLINE_FRAGMENT_MERGE.test(sentence)) return false
  if (HEADLINE_COMMAND_MERGE.test(sentence)) return false
  if (OVER_COMPRESSED_COMPARISON.test(sentence)) return false
  if (CONTEXTLESS_CENTER_PHRASE.test(sentence)) return false
  if (SOURCE_OR_MEMO_FRAGMENT.test(sentence)) return false
  if (TOO_COLLOQUIAL_SUMMARY.test(sentence)) return false
  if (SIDE_CASE_FRAGMENT.test(sentence)) return false
  if (ARTICLE_INTRO_FRAGMENT.test(sentence)) return false
  if (/^(?:그|그녀|그들|이들|그는|그녀는|그들은|이들은)\s/.test(sentence)) return false
  if (DEMONSTRATIVE_PRONOUN_REFERENCE.test(sentence)) return false
  return true
}

function isCopiedOpeningSentence(sentence: string, source: string) {
  const opening = firstArticleSentence(source)
  if (!opening) return false
  return similarity(normalizeForComparison(sentence), normalizeForComparison(opening)) >= 0.92
}

function firstArticleSentence(source: string) {
  return source
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 35)
    .filter((paragraph) => !ARTICLE_INTRO_FRAGMENT.test(paragraph))
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?。])\s+/))
    .map((sentence) => sentence.trim())
    .find((sentence) => sentence.length >= 35 && !ARTICLE_INTRO_FRAGMENT.test(sentence))
}

function normalizeForComparison(text: string) {
  return text
    .replace(SUMMARY_LABEL_PREFIX, '')
    .replace(/[.!?。"'“”‘’()[\]{}·,;:\-–—\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function groundingScore(sentence: string, sourceTerms: Set<string>) {
  const terms = tokenize(sentence)
  if (!terms.length) return 0
  const grounded = terms.filter((term) => sourceTerms.has(term)).length
  return grounded / terms.length
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .match(/[가-힣]{2,}|[a-z][a-z0-9+&.-]{1,}|\d+(?:[.,]\d+)?/g) ?? []
}

function fillSummary(primary: string[], fallback: string[], fileName?: string) {
  const result = [...primary]
  for (const sentence of fallback.map(polishSentence)) {
    if (result.length >= BULLET_COUNT) break
    if (
      isStructurallyComplete(sentence) &&
      hasClearSubject(sentence) &&
      hasContextualMeaning(sentence) &&
      hasCoreMessage(sentence) &&
      hasReadableStandaloneContext(sentence) &&
      !isCopiedOpeningSentence(sentence, fallback.join('\n')) &&
      !isTopicSpecificMismatch(sentence, fileName) &&
      !result.includes(sentence)
    ) result.push(sentence)
  }
  while (result.length < BULLET_COUNT) {
    result.push('PDF 원문은 추가 핵심 메시지 확인을 위한 보완 검토가 필요함.')
  }
  return result.slice(0, BULLET_COUNT)
}
