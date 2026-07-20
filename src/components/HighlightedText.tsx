type HighlightedTextProps = {
  keywords: string[]
  text: string
  usedKeywords?: Set<string>
}

export function HighlightedText({ keywords, text, usedKeywords }: HighlightedTextProps) {
  const activeKeywords = keywords.filter(Boolean).sort((a, b) => b.length - a.length)

  if (activeKeywords.length === 0) {
    return <>{text}</>
  }

  const pattern = new RegExp(`(${activeKeywords.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(pattern)
  const highlighted = usedKeywords ?? new Set<string>()

  return (
    <>
      {parts.map((part, index) => {
        const isKeyword = activeKeywords.some(
          (keyword) => keyword.toLowerCase() === part.toLowerCase(),
        )
        const normalized = part.toLowerCase()

        if (isKeyword && !highlighted.has(normalized)) {
          highlighted.add(normalized)
          return (
          <span key={`${part}-${index}`} className="font-semibold text-[#0000ff]">
            {part}
          </span>
          )
        }

        return <span key={`${part}-${index}`}>{part}</span>
      })}
    </>
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
