'use client'

import { cn } from '@/lib/utils'

interface EditBannerProps {
  night: boolean
  selected: DormSelection | null
  preview: { name: string } | null
  saving: boolean
  accepting: boolean
  storedItems: DormMovableInfo[]
  storageOpen: boolean
  onToggleStorage: () => void
  onRestoreItem: (id: string) => void
  onStoreItem: () => void
  onAddItem: () => void
  onDone: () => void
  onRotate: (deltaDeg: number) => void
  onResetItem: () => void
  onDeleteItem: () => void
  onDeselect: () => void
  onAcceptPreview: () => void
  onRegeneratePreview: () => void
  onCancelPreview: () => void
}

function Chip({
  onClick,
  children,
  tone = 'dark',
  disabled,
  ariaLabel,
}: {
  onClick: () => void
  children: React.ReactNode
  tone?: 'dark' | 'light' | 'danger'
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'rounded-lg px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors duration-200 disabled:opacity-50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold',
        tone === 'dark' && 'bg-textPrimary text-beige hover:bg-brownAccent',
        tone === 'light' && 'bg-beige/80 text-textPrimary hover:bg-beige',
        tone === 'danger' && 'bg-[#E5484D] text-white hover:bg-[#c73a3f]'
      )}
    >
      {children}
    </button>
  )
}

export default function EditBanner({
  night,
  selected,
  preview,
  saving,
  accepting,
  storedItems,
  storageOpen,
  onToggleStorage,
  onRestoreItem,
  onStoreItem,
  onAddItem,
  onDone,
  onRotate,
  onResetItem,
  onDeleteItem,
  onDeselect,
  onAcceptPreview,
  onRegeneratePreview,
  onCancelPreview,
}: EditBannerProps) {
  const subCardCls = cn(
    'pointer-events-auto flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 rounded-xl border px-3 py-1.5 shadow-[0_2px_12px_rgba(44,31,14,0.2)]',
    night ? 'border-[#4A3D2A] bg-[#221A12] text-[#F5F0E8]' : 'border-grid bg-beige text-textPrimary'
  )
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex w-[min(94%,640px)] -translate-x-1/2 flex-col items-center gap-2">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl border border-goldLight bg-gold px-3.5 py-2 text-textPrimary shadow-[0_2px_12px_rgba(44,31,14,0.25)]">
        <span className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-textPrimary" />
          Editing
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.15em] opacity-80 sm:inline">
          Drag to move · tap an item to rotate
        </span>
        <span className="flex items-center gap-1.5">
          <Chip onClick={onAddItem}>+ Add Item</Chip>
          <Chip onClick={onToggleStorage}>
            Storage ({storedItems.length})
          </Chip>
          <Chip onClick={onDone}>{saving ? 'Saving…' : 'Done'}</Chip>
        </span>
      </div>

      {storageOpen && (
        <div className={subCardCls}>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-textMuted">
            Furniture Storage
          </span>
          {storedItems.length === 0 ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-textMuted">
              Empty · select an item and hit Store
            </span>
          ) : (
            storedItems.map((item) => (
              <Chip key={item.id} onClick={() => onRestoreItem(item.id)} ariaLabel={`Place ${item.label} back in the room`}>
                ↩ {item.label}
              </Chip>
            ))
          )}
        </div>
      )}

      {selected && !preview && (
        <div className={subCardCls}>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">
            {selected.label}
          </span>
          {selected.kind === 'floor' ? (
            <span className="flex items-center gap-1.5">
              <Chip onClick={() => onRotate(-15)} ariaLabel="Rotate counterclockwise 15 degrees">
                ⟲ 15°
              </Chip>
              <Chip onClick={() => onRotate(15)} ariaLabel="Rotate clockwise 15 degrees">
                ⟳ 15°
              </Chip>
            </span>
          ) : (
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-textMuted">
              Drag between walls · red = not on a wall
            </span>
          )}
          <Chip onClick={onStoreItem} ariaLabel={`Move ${selected.label} to furniture storage`}>
            Store
          </Chip>
          <Chip onClick={onResetItem}>Reset</Chip>
          {selected.custom && (
            <Chip onClick={onDeleteItem} tone="danger">
              Delete
            </Chip>
          )}
          <Chip onClick={onDeselect} ariaLabel="Deselect item">
            ✕
          </Chip>
        </div>
      )}

      {preview && (
        <div
          className={cn(
            'pointer-events-auto flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 rounded-xl border px-3 py-1.5 shadow-[0_2px_12px_rgba(44,31,14,0.2)]',
            night ? 'border-[#4A3D2A] bg-[#221A12] text-[#F5F0E8]' : 'border-grid bg-beige text-textPrimary'
          )}
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">
            New: {preview.name}
          </span>
          <Chip onClick={onAcceptPreview} disabled={accepting}>
            {accepting ? 'Saving…' : 'Accept'}
          </Chip>
          <Chip onClick={onRegeneratePreview} disabled={accepting}>
            Regenerate
          </Chip>
          <Chip onClick={onCancelPreview} disabled={accepting}>
            Cancel
          </Chip>
        </div>
      )}
    </div>
  )
}
