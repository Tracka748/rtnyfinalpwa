'use client'

// Renders `text` with the first occurrence of `word` in the accent color.
export function HighlightedText({ text, word, color }: { text: string; word: string; color: string }) {
  const i = word ? text.indexOf(word) : -1
  if (i === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color }}>{word}</span>
      {text.slice(i + word.length)}
    </>
  )
}
