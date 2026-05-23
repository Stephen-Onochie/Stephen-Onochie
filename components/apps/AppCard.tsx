import Link from 'next/link'

interface AppCardProps {
  name: string
  description: string
  icon: string
  href: string
}

export default function AppCard({ name, description, icon, href }: AppCardProps) {
  return (
    <Link
      href={href}
      className="block bg-beige border border-gold rounded-2xl p-6 hover:shadow-lg hover:border-brownAccent transition-all duration-200 group"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-playfair text-xl font-bold text-textPrimary group-hover:text-brownAccent transition-colors mb-2">
        {name}
      </h3>
      <p className="text-textMuted font-inter text-sm leading-relaxed">{description}</p>
    </Link>
  )
}
