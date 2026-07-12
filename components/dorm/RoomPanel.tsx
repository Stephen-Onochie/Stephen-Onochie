'use client'

import { cn } from '@/lib/utils'

const SOON_ROWS = [
  'Sleep Mode',
  'Study Mode',
  'Wake Mode',
  'Smart Fan',
  'Smart Blinds',
  'Scent Diffusers',
] as const

const LIVE_TOGGLES = [
  { key: 'lightsOn', label: 'String Lights' },
  { key: 'computerOn', label: 'Computer' },
  { key: 'tvOn', label: 'TV' },
  { key: 'curtainsOpen', label: 'Curtains', onWord: 'Open', offWord: 'Closed' },
  { key: 'fansOn', label: 'Fans' },
] as const

interface RoomPanelProps {
  room: DormRoomState
  night: boolean
  editMode: boolean
  autoSpin: boolean
  isMobile: boolean
  panelOpen: boolean
  onSend: (partial: Partial<DormRoomState>) => void
  onSetEditMode: (on: boolean) => void
  onToggleAutoSpin: () => void
  onResetView: () => void
  onTogglePanel: () => void
}

function Segmented({
  night,
  ariaLabel,
  options,
}: {
  night: boolean
  ariaLabel: string
  options: { label: string; active: boolean; onClick: () => void }[]
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex gap-0.5 rounded-lg border p-0.5',
        night ? 'border-[#4A3D2A] bg-[#2B2118]' : 'border-grid bg-[#E3DCCB]'
      )}
    >
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={option.onClick}
          aria-pressed={option.active}
          className={cn(
            'rounded-md px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold',
            option.active ? 'bg-gold text-textPrimary' : 'text-textMuted'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ToggleRow({
  label,
  on,
  night,
  onToggle,
  onWord = 'On',
  offWord = 'Off',
}: {
  label: string
  on: boolean
  night: boolean
  onToggle: () => void
  onWord?: string
  offWord?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2.5 border-b py-3',
        night ? 'border-[#4A3D2A]' : 'border-grid'
      )}
    >
      <span
        className={cn(
          'font-mono text-[11px] font-semibold uppercase tracking-[0.2em]',
          night ? 'text-[#F5F0E8]' : 'text-textPrimary'
        )}
      >
        {label}
      </span>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'font-mono text-[9px] uppercase tracking-[0.18em]',
            on ? (night ? 'text-[#F5F0E8]' : 'text-textPrimary') : 'text-textMuted'
          )}
        >
          {on ? onWord : offWord}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={label}
          onClick={onToggle}
          className={cn(
            'relative h-[22px] w-10 rounded-full border transition-colors duration-200',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold',
            on
              ? 'border-gold bg-gold'
              : night
                ? 'border-[#4A3D2A] bg-[#2B2118]'
                : 'border-grid bg-[#E3DCCB]'
          )}
        >
          <span
            className={cn(
              'absolute left-0.5 top-0.5 block h-4 w-4 rounded-full bg-beige shadow-[0_1px_2px_rgba(44,31,14,0.25)] transition-transform duration-200 motion-reduce:transition-none',
              on ? 'translate-x-[18px]' : 'translate-x-0'
            )}
          />
        </button>
      </div>
    </div>
  )
}

export default function RoomPanel({
  room,
  night,
  editMode,
  autoSpin,
  isMobile,
  panelOpen,
  onSend,
  onSetEditMode,
  onToggleAutoSpin,
  onResetView,
  onTogglePanel,
}: RoomPanelProps) {
  const segmentedRow = cn(
    'flex items-center justify-between gap-2.5 border-b py-2.5',
    night ? 'border-[#4A3D2A]' : 'border-grid'
  )
  const segmentedLabel = cn(
    'font-mono text-[11px] font-semibold uppercase tracking-[0.2em]',
    night ? 'text-[#F5F0E8]' : 'text-textPrimary'
  )

  return (
    <aside
      aria-hidden={isMobile && !panelOpen ? true : undefined}
      className={
        isMobile
          ? cn(
              'fixed inset-x-0 bottom-0 z-30 max-h-[62vh] overflow-y-auto rounded-t-[20px] border-t px-4 pb-6 shadow-[0_-10px_34px_rgba(44,31,14,0.18)]',
              'transition-[transform,visibility] duration-[250ms] motion-reduce:transition-none',
              night ? 'border-[#4A3D2A] bg-[#14100C]' : 'border-grid bg-beige',
              panelOpen
                ? 'visible translate-y-0'
                : 'pointer-events-none invisible translate-y-full'
            )
          : 'w-[330px] flex-none overflow-y-auto pb-6 pl-1.5 pr-5 pt-4'
      }
    >
      {isMobile && (
        <button
          type="button"
          onClick={onTogglePanel}
          aria-label="Toggle control panel"
          className="block w-full pb-3.5 pt-2"
        >
          <span className="mx-auto block h-1 w-11 rounded-full bg-grid" />
        </button>
      )}

      <section
        className={cn(
          'rounded-2xl border p-5 transition-colors duration-300',
          night ? 'border-[#4A3D2A] bg-[#221A12]' : 'border-goldLight bg-surface'
        )}
      >
        <div className="mb-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-textMuted">
          Room OS
        </div>

        <div className={segmentedRow}>
          <span className={segmentedLabel}>Interact</span>
          <Segmented
            night={night}
            ariaLabel="View or edit mode"
            options={[
              { label: 'View', active: !editMode, onClick: () => onSetEditMode(false) },
              { label: 'Edit', active: editMode, onClick: () => onSetEditMode(true) },
            ]}
          />
        </div>

        <div className={segmentedRow}>
          <span className={segmentedLabel}>Mode</span>
          <Segmented
            night={night}
            ariaLabel="Day or night mode"
            options={[
              { label: 'Day', active: room.mode === 'day', onClick: () => onSend({ mode: 'day' }) },
              { label: 'Night', active: room.mode === 'night', onClick: () => onSend({ mode: 'night' }) },
            ]}
          />
        </div>

        {LIVE_TOGGLES.map((toggle) => (
          <ToggleRow
            key={toggle.key}
            label={toggle.label}
            on={room[toggle.key]}
            night={night}
            onToggle={() => onSend({ [toggle.key]: !room[toggle.key] })}
            onWord={'onWord' in toggle ? toggle.onWord : undefined}
            offWord={'offWord' in toggle ? toggle.offWord : undefined}
          />
        ))}

        <ToggleRow label="Auto Spin" on={autoSpin} night={night} onToggle={onToggleAutoSpin} />

        <button
          type="button"
          onClick={onResetView}
          className={cn(
            'mt-4 block w-full rounded-lg bg-gold py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-textPrimary transition-colors duration-200 hover:bg-brownAccent hover:text-beige',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'
          )}
        >
          Reset View
        </button>
      </section>

      <section
        aria-disabled="true"
        className={cn(
          'mt-3.5 rounded-2xl border p-5 opacity-[0.62] transition-colors duration-300',
          night ? 'border-[#4A3D2A] bg-[#221A12]' : 'border-grid bg-surface'
        )}
      >
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-textMuted">
            Smart Home Control
          </span>
          <span className="rounded-full bg-gold px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.2em] text-white">
            Soon
          </span>
        </div>
        {SOON_ROWS.map((row) => (
          <div
            key={row}
            className={cn(
              'flex cursor-not-allowed items-center justify-between border-b py-2.5',
              night ? 'border-[#4A3D2A]' : 'border-grid'
            )}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-textMuted">
              {row}
            </span>
            <span
              className={cn(
                'block h-[22px] w-10 rounded-full border',
                night ? 'border-[#4A3D2A] bg-[#2B2118]' : 'border-grid bg-[#E3DCCB]'
              )}
            />
          </div>
        ))}
        <p className="mt-3 font-inter text-xs leading-relaxed text-textMuted">
          Olfactory-conditioned modes, fan, and blinds. Wiring the real room next.
        </p>
      </section>
    </aside>
  )
}
