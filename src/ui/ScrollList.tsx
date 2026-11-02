import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

// Measure actual rows and reveal half of the sixth item as a scrolling cue.
export default function ScrollList({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const [height, setHeight] = useState<number>()
  useLayoutEffect(() => {
    const viewport = ref.current!
    const list = viewport.firstElementChild as HTMLElement | null
    if (!list) return
    const measure = () => {
      const rows = Array.from(list.children) as HTMLElement[]
      const sixth = rows[5]?.getBoundingClientRect()
      setHeight(sixth
        ? Math.ceil(sixth.top + sixth.height / 2 - list.getBoundingClientRect().top)
        : undefined)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    Array.from(list.children).slice(0, 6).forEach((row) => observer.observe(row))
    return () => observer.disconnect()
  }, [children])
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
