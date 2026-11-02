type IconName =
  | 'box'
  | 'plus'
  | 'minus'
  | 'search'
  | 'menu'
  | 'back'
  | 'arrow'
  | 'close'
  | 'tag'
  | 'clock'
  | 'edit'
  | 'download'
  | 'upload'
  | 'message'
  | 'shield'
  | 'leaf'
  | 'check'
const paths: Record<IconName, React.ReactNode> = {
  box: (
    <>
      <path d="m3 7 9-4 9 4v10l-9 4-9-4Z" />
      <path d="m3 7 9 4 9-4M12 11v10M7.5 5 16.5 9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  menu: <path d="M5 6h14M5 12h14M5 18h14" />,
  back: <path d="m14 5-7 7 7 7M7 12h14" />,
  arrow: <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  tag: (
    <>
      <path d="m3 3 9 .5L21 12l-9 9-8.5-9Z" />
      <circle cx="8" cy="8" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  edit: <path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14Z" />,
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6" />,
  upload: <path d="M12 15V3m-5 5 5-5 5 5M4 15v6h16v-6" />,
  message: <path d="M21 11a8 8 0 0 1-8 8H7l-5 3 1-7a8 8 0 0 1 7-12h3a8 8 0 0 1 8 8Z" />,
  shield: (
    <>
      <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3C8 2 2 7 5 15s16 6 15-12Z" />
      <path d="M4 21 16 8" />
    </>
  ),
  check: <path d="m5 12 4 4L20 5" />,
}
export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
