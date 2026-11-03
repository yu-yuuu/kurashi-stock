import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

// Measure actual rows and reveal half of the following item as a scrolling cue.
export default function ScrollList({ label, children, visibleRows = 5 }: { label: string; children: ReactNode; visibleRows?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => {
    const viewport = ref.current!
    const list = viewport.firstElementChild as HTMLElement | null
    if (!list) return
    const measure = () => {
      const rows = Array.from(list.children) as HTMLElement[]
      const partial = rows[visibleRows]?.getBoundingClientRect()
      setHeight(partial
        ? Math.ceil(partial.top + partial.height / 2 - list.getBoundingClientRect().top)
        : undefined)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    Array.from(list.children).slice(0, visibleRows + 1).forEach((row) => observer.observe(row))
    return () => observer.disconnect()
  }, [children, visibleRows])
  return (
    <>
      <div ref={ref} className="scroll-list" style={{ maxHeight: height }}
        role="region" aria-label={label} tabIndex={height === undefined ? undefined : 0}
        aria-describedby={height === undefined ? undefined : helpId}>
        {children}
      </div>
      {height !== undefined && <p id={helpId} className="scroll-list-help">上下にスクロールして続きを表示できます。</p>}
    </>
  )
}
