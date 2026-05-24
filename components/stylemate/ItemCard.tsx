'use client'

import { APPAREL_CATEGORIES, LAUNDRY_STATUSES } from '@/lib/stylemate/constants'
import type { LaundryStatus, WardrobeItemWithSignedUrl } from '@/types/stylemate'

interface ItemCardProps {
  item: WardrobeItemWithSignedUrl
  onStatusChange: (id: string, status: LaundryStatus) => void
  onClick: (item: WardrobeItemWithSignedUrl) => void
}

export default function ItemCard({ item, onStatusChange, onClick }: ItemCardProps) {
  const categoryLabel =
    APPAREL_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="text-left bg-surface border border-goldLight rounded-2xl overflow-hidden hover:border-gold transition-colors w-full"
    >
      <div className="aspect-square bg-beige relative">
        {item.signed_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.signed_image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-textMuted">
            👕
          </div>
        )}
        {item.is_incoming && (
          <span className="absolute top-2 right-2 bg-gold text-white text-xs font-inter font-medium px-2 py-0.5 rounded-full">
            Incoming
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-playfair text-sm font-bold text-textPrimary truncate">{item.name}</h3>
        <p className="font-inter text-xs text-textMuted mt-0.5 capitalize">
          {categoryLabel}
          {item.sub_type ? ` · ${item.sub_type.replace(/_/g, ' ')}` : ''}
        </p>
        <p className="font-inter text-xs text-textMuted capitalize mt-0.5">
          {item.color.replace(/_/g, ' ')}
        </p>
        <select
          value={item.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            onStatusChange(item.id, e.target.value as LaundryStatus)
          }}
          className="mt-2 w-full text-xs font-inter border border-goldLight rounded-lg px-2 py-1.5 bg-beige text-textPrimary focus:outline-none focus:border-gold min-h-[36px]"
        >
          {LAUNDRY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </button>
  )
}
