// Vector trace of public/logo-so.png so the mark takes the text color in both themes.
export default function SoLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="78 110 849 785" className={className} fill="currentColor" aria-hidden="true">
      <path d="M78 110H480V304L343 347V241H208V456L480 371V895H78V701L208 660V771H342V552L78 634Z" />
      <path fillRule="evenodd" d="M527 110H927V895H527ZM657 241V771H790V241Z" />
    </svg>
  )
}
