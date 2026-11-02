let locks = 0
let restore: (() => void) | undefined

export function lockBackgroundScroll() {
  if (locks++ === 0) {
    const body = document.body
    const root = document.documentElement
    const x = window.scrollX
    const y = window.scrollY
    const route = window.location.hash
    const properties = ['position', 'top', 'left', 'width', 'overflow']
    const saved = properties.map((name) => [name, body.style.getPropertyValue(name), body.style.getPropertyPriority(name)])
    const rootOverflow = [root.style.getPropertyValue('overflow'), root.style.getPropertyPriority('overflow')]
    body.style.position = 'fixed'
    body.style.top = `${-y}px`
    body.style.left = `${-x}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    root.style.overflow = 'hidden'
    restore = () => {
      for (const [name, value, priority] of saved) body.style.setProperty(name, value, priority)
      root.style.setProperty('overflow', rootOverflow[0], rootOverflow[1])
      window.scrollTo({ left: window.location.hash === route ? x : 0,
        top: window.location.hash === route ? y : 0, behavior: 'instant' })
    }
  }
  let released = false
  return () => {
    if (released) return
    released = true
    if (--locks === 0) {
      restore?.()
      restore = undefined
    }
  }
}
