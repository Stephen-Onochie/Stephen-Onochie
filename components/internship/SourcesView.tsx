'use client'

import { useState } from 'react'
import {
  Plus,
  X,
  Trash2,
  Sparkles,
  Loader2,
  ExternalLink,
  Radar,
  Building2,
  Search,
  Link2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  createFocusArea,
  updateFocusArea,
  deleteFocusArea,
  createTarget,
  updateTarget,
  deleteTarget,
} from '@/lib/internship/supabase'
import { ATS_LABELS, MAX_AREA_LINKEDIN_SEARCHES, isUrl } from '@/lib/internship/sources'
import type { Application, AtsPlatform, FocusArea, FocusAreaLink, Target } from '@/types/internship'
import { Button, Field, TextInput, TextArea, Pill } from './ui'

const GREEN = '#7C8C5A'

interface DetectedBoard {
  platform: AtsPlatform
  slug: string
  jobs: number
  internships: number
}

interface Suggestion {
  company: string
  why: string
  careers_url: string | null
}

async function detectBoard(company: string, url?: string): Promise<DetectedBoard | null> {
  try {
    const res = await fetch('/api/internship/sources/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, url }),
    })
    if (!res.ok) return null
    return (await res.json()).board ?? null
  } catch {
    return null
  }
}

function splitTerms(raw: string): string[] {
  return raw
    .split(isUrl(raw) ? /\n/ : /[,\n]/)
    .map(t => t.trim())
    .filter(Boolean)
}

export default function SourcesView({
  areas,
  targets,
  applications,
  onAreasChange,
  onTargetsChange,
  onShowOnBoard,
}: {
  areas: FocusArea[]
  targets: Target[]
  applications: Application[]
  onAreasChange: (a: FocusArea[]) => void
  onTargetsChange: (t: Target[]) => void
  onShowOnBoard: (areaId: string) => void
}) {
  const supabase = createClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTerms, setNewTerms] = useState('')
  const [saving, setSaving] = useState(false)

  const untagged = targets.filter(t => !t.focus_area_id || !areas.some(a => a.id === t.focus_area_id))
  const scannedSearches = areas.filter(a => a.active).reduce((n, a) => n + a.search_terms.length, 0)

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const created = await createFocusArea(supabase, {
        name: newName.trim(),
        description: newDesc.trim() || null,
        search_terms: splitTerms(newTerms),
        sort_order: areas.length,
      })
      onAreasChange([...areas, created])
      setNewName('')
      setNewDesc('')
      setNewTerms('')
      setCreating(false)
    } catch (e) {
      alert((e as { message?: string }).message ?? 'Could not create area')
    } finally {
      setSaving(false)
    }
  }

  function patchAreaLocal(id: string, patch: Partial<FocusArea>) {
    onAreasChange(areas.map(a => (a.id === id ? { ...a, ...patch } : a)))
  }

  async function patchArea(id: string, patch: Partial<FocusArea>) {
    patchAreaLocal(id, patch)
    await updateFocusArea(supabase, id, patch)
  }

  async function removeArea(area: FocusArea) {
    const companies = targets.filter(t => t.focus_area_id === area.id).length
    if (
      !confirm(
        `Delete "${area.name}"?` +
          (companies ? ` Its ${companies} compan${companies === 1 ? 'y moves' : 'ies move'} to Unassigned.` : '') +
          ' Applications keep their cards but lose the tag.'
      )
    )
      return
    await deleteFocusArea(supabase, area.id)
    onAreasChange(areas.filter(a => a.id !== area.id))
    onTargetsChange(targets.map(t => (t.focus_area_id === area.id ? { ...t, focus_area_id: null } : t)))
  }

  async function addTarget(areaId: string | null, company: string, url?: string): Promise<DetectedBoard | null> {
    const board = await detectBoard(company, url)
    const created = await createTarget(supabase, {
      company,
      ats_platform: board?.platform ?? null,
      ats_slug: board?.slug ?? null,
      careers_url: url && !board ? url : null,
      active: !!board,
      focus_area_id: areaId,
    })
    onTargetsChange([...targets, created])
    return board
  }

  async function patchTarget(id: string, patch: Partial<Target>) {
    onTargetsChange(targets.map(t => (t.id === id ? { ...t, ...patch } : t)))
    await updateTarget(supabase, id, patch)
  }

  async function removeTarget(t: Target) {
    if (!confirm(`Stop tracking ${t.company}?`)) return
    await deleteTarget(supabase, t.id)
    onTargetsChange(targets.filter(x => x.id !== t.id))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-[13px] max-w-[640px]" style={{ color: 'var(--iven-muted)' }}>
          Fields you&apos;re exploring. Twice a day the ingestion scan runs each active area&apos;s search terms on
          LinkedIn and checks its companies&apos; job boards; new internships land in Wishlist tagged with the area.
        </p>
        <Button onClick={() => setCreating(c => !c)}>
          <span className="flex items-center gap-1.5">
            <Plus size={13} /> New Area
          </span>
        </Button>
      </div>

      {scannedSearches > MAX_AREA_LINKEDIN_SEARCHES && (
        <div className="font-mono text-[10px]" style={{ color: '#A8743B' }}>
          {scannedSearches} search terms across active areas. Each scan runs {MAX_AREA_LINKEDIN_SEARCHES}, taking
          terms from every area in turn (LinkedIn throttles bursts), so pause an area or trim terms to cover the rest.
        </div>
      )}

      {creating && (
        <Card>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <Field label="Area name">
              <TextInput
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Medical Devices"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </Field>
            <Field label="Search terms (comma separated)">
              <TextInput
                value={newTerms}
                onChange={e => setNewTerms(e.target.value)}
                placeholder="medical device, biomedical engineering"
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Why it interests you (optional)">
              <TextArea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? 'Saving…' : 'Create Area'}
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {areas.length === 0 && !creating && (
        <Card>
          <div className="text-[13px]" style={{ color: 'var(--iven-muted)' }}>
            No areas yet. Add one for each field you want to start applying in.
          </div>
        </Card>
      )}

      {areas.map(area => (
        <AreaCard
          key={area.id}
          area={area}
          targets={targets.filter(t => t.focus_area_id === area.id)}
          applications={applications.filter(a => a.focus_area_id === area.id)}
          allCompanies={targets.map(t => t.company)}
          onPatch={p => patchArea(area.id, p)}
          onDelete={() => removeArea(area)}
          onAddTarget={(company, url) => addTarget(area.id, company, url)}
          onPatchTarget={patchTarget}
          onRemoveTarget={removeTarget}
          onShowOnBoard={() => onShowOnBoard(area.id)}
        />
      ))}

      {untagged.length > 0 && (
        <Card>
          <SectionHeader icon={<Building2 size={13} />} title="Unassigned companies" />
          <div className="text-[12px] mb-3" style={{ color: 'var(--iven-muted)' }}>
            Scanned on every run. Move one into an area to group it.
          </div>
          <TargetList
            targets={untagged}
            areas={areas}
            onPatch={patchTarget}
            onRemove={removeTarget}
          />
        </Card>
      )}
    </div>
  )
}

function AreaCard({
  area,
  targets,
  applications,
  allCompanies,
  onPatch,
  onDelete,
  onAddTarget,
  onPatchTarget,
  onRemoveTarget,
  onShowOnBoard,
}: {
  area: FocusArea
  targets: Target[]
  applications: Application[]
  allCompanies: string[]
  onPatch: (p: Partial<FocusArea>) => Promise<void>
  onDelete: () => void
  onAddTarget: (company: string, url?: string) => Promise<DetectedBoard | null>
  onPatchTarget: (id: string, p: Partial<Target>) => Promise<void>
  onRemoveTarget: (t: Target) => void
  onShowOnBoard: () => void
}) {
  const [open, setOpen] = useState(true)
  const [termDraft, setTermDraft] = useState('')
  const [companyDraft, setCompanyDraft] = useState('')
  const [urlDraft, setUrlDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [addMsg, setAddMsg] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [suggestedTerms, setSuggestedTerms] = useState<string[]>([])
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null)

  const scanned = targets.filter(t => t.active && t.ats_platform && t.ats_slug).length
  const applied = applications.filter(a => a.applied_at).length

  function addTerms(raw: string) {
    const next = Array.from(new Set([...area.search_terms, ...splitTerms(raw)]))
    if (next.length !== area.search_terms.length) onPatch({ search_terms: next })
  }

  async function handleAddCompany() {
    const company = companyDraft.trim()
    if (!company) return
    setAdding(true)
    setAddMsg('')
    try {
      const board = await onAddTarget(company, urlDraft.trim() || undefined)
      setAddMsg(
        board
          ? `Found ${company}'s ${ATS_LABELS[board.platform]} board: ${board.jobs} openings, ${board.internships} internship${board.internships === 1 ? '' : 's'} right now. It'll be scanned automatically.`
          : `No public Greenhouse/Lever/Ashby board found for ${company}. Saved as a manual check${urlDraft ? '' : '; use Edit to add its careers link'}.`
      )
      setCompanyDraft('')
      setUrlDraft('')
    } catch (e) {
      setAddMsg((e as { message?: string }).message?.includes('duplicate') ? `${company} is already tracked.` : 'Could not add company.')
    } finally {
      setAdding(false)
    }
  }

  async function handleSuggest() {
    setSuggesting(true)
    try {
      const res = await fetch('/api/internship/sources/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: area.name,
          description: area.description,
          search_terms: area.search_terms,
          existing: allCompanies,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Suggestion failed')
        return
      }
      setSuggestions(data.companies ?? [])
      setSuggestedTerms((data.search_terms ?? []).filter((t: string) => !area.search_terms.includes(t)))
    } catch {
      alert('Suggestion failed')
    } finally {
      setSuggesting(false)
    }
  }

  async function addSuggestion(s: Suggestion) {
    setAddingSuggestion(s.company)
    try {
      await onAddTarget(s.company, s.careers_url ?? undefined)
      setSuggestions(prev => prev?.filter(x => x.company !== s.company) ?? null)
    } catch {
      alert(`${s.company} is already tracked.`)
    } finally {
      setAddingSuggestion(null)
    }
  }

  function addLink() {
    let host: string
    try {
      host = new URL(linkUrl.trim()).hostname
    } catch {
      return
    }
    const link: FocusAreaLink = { label: linkLabel.trim() || host, url: linkUrl.trim() }
    onPatch({ links: [...area.links, link] })
    setLinkLabel('')
    setLinkUrl('')
  }

  return (
    <Card dim={!area.active}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => setOpen(o => !o)} className="mt-1.5" style={{ color: 'var(--iven-muted)' }} aria-label="Toggle">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          <input
            key={area.name}
            defaultValue={area.name}
            onBlur={e => {
              const v = e.target.value.trim()
              if (v && v !== area.name) onPatch({ name: v })
            }}
            className="font-playfair font-bold text-[20px] bg-transparent outline-none w-full"
            style={{ color: 'var(--iven-text)' }}
          />
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Pill color={GREEN}>{scanned} auto-scanned</Pill>
            <Pill>{targets.length - scanned} manual</Pill>
            <Pill>{area.search_terms.length} searches</Pill>
            <Pill color="var(--iven-accent)">
              {applications.length} on board · {applied} applied
            </Pill>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {applications.length > 0 && (
            <Button variant="ghost" onClick={onShowOnBoard}>
              View on Board
            </Button>
          )}
          <button
            onClick={() => onPatch({ active: !area.active })}
            className="font-mono text-[10px] font-semibold tracking-[1px] uppercase rounded-lg px-2.5 py-2"
            style={{
              background: area.active ? `color-mix(in srgb, ${GREEN} 16%, var(--iven-bg))` : 'var(--iven-bg)',
              border: '1px solid var(--iven-border)',
              color: area.active ? GREEN : 'var(--iven-muted)',
            }}
            title={area.active ? 'Scanning on every ingestion run. Click to pause.' : 'Paused. Click to resume scanning.'}
          >
            <span className="flex items-center gap-1.5">
              <Radar size={12} /> {area.active ? 'Scanning' : 'Paused'}
            </span>
          </button>
          <button onClick={onDelete} style={{ color: 'var(--iven-muted)' }} title="Delete area" aria-label="Delete area">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-5 mt-4 pl-7">
          <TextArea
            key={`desc-${area.id}`}
            defaultValue={area.description ?? ''}
            placeholder="Why this field? What kind of role are you after?"
            rows={2}
            onBlur={e => {
              const v = e.target.value.trim() || null
              if (v !== area.description) onPatch({ description: v })
            }}
          />

          {/* Search terms */}
          <div>
            <SectionHeader icon={<Search size={13} />} title="LinkedIn search terms" />
            <div className="flex flex-wrap gap-1.5 mb-2">
              {area.search_terms.map(term => (
                <span
                  key={term}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] max-w-full"
                  style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
                  title={isUrl(term) ? term : `Searches "${term} intern" across the US, posted in the last 30 days`}
                >
                  <span className="truncate">{isUrl(term) ? 'Custom LinkedIn search' : term}</span>
                  <button
                    onClick={() => onPatch({ search_terms: area.search_terms.filter(t => t !== term) })}
                    style={{ color: 'var(--iven-muted)' }}
                    aria-label={`Remove ${term}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              {area.search_terms.length === 0 && (
                <span className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>No search terms yet.</span>
              )}
            </div>
            <TextInput
              value={termDraft}
              onChange={e => setTermDraft(e.target.value)}
              placeholder="Add a keyword (or paste a LinkedIn jobs search URL) and press Enter"
              onKeyDown={e => {
                if (e.key === 'Enter' && termDraft.trim()) {
                  addTerms(termDraft)
                  setTermDraft('')
                }
              }}
            />
          </div>

          {/* Companies */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <SectionHeader icon={<Building2 size={13} />} title="Companies" noMargin />
              <Button variant="ghost" onClick={handleSuggest} disabled={suggesting}>
                <span className="flex items-center gap-1.5">
                  {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {suggesting ? 'Researching…' : 'Suggest Companies'}
                </span>
              </Button>
            </div>

            {suggestions && (
              <div
                className="rounded-xl p-3 mb-3 flex flex-col gap-2"
                style={{ background: 'color-mix(in srgb, var(--iven-accent) 7%, var(--iven-bg))', border: '1px solid var(--iven-grid)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-semibold tracking-[1.5px] uppercase" style={{ color: 'var(--iven-accent)' }}>
                    Suggestions (verify before applying)
                  </span>
                  <button onClick={() => setSuggestions(null)} style={{ color: 'var(--iven-muted)' }} aria-label="Dismiss">
                    <X size={13} />
                  </button>
                </div>
                {suggestions.length === 0 && (
                  <div className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>Nothing new to suggest.</div>
                )}
                {suggestions.map(s => (
                  <div key={s.company} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: 'var(--iven-text)' }}>
                        {s.company}
                        {s.careers_url && (
                          <a href={s.careers_url} target="_blank" rel="noreferrer" style={{ color: 'var(--iven-muted)' }}>
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      {s.why && <div className="text-[11px]" style={{ color: 'var(--iven-muted)' }}>{s.why}</div>}
                    </div>
                    <Button variant="ghost" onClick={() => addSuggestion(s)} disabled={addingSuggestion !== null}>
                      {addingSuggestion === s.company ? 'Adding…' : 'Add'}
                    </Button>
                  </div>
                ))}
                {suggestedTerms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px]" style={{ color: 'var(--iven-muted)' }}>Search terms:</span>
                    {suggestedTerms.map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          addTerms(t)
                          setSuggestedTerms(prev => prev.filter(x => x !== t))
                        }}
                        className="rounded-md px-2 py-0.5 text-[11px]"
                        style={{ border: '1px dashed var(--iven-border)', color: 'var(--iven-text)' }}
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <TargetList targets={targets} onPatch={onPatchTarget} onRemove={onRemoveTarget} />

            <div className="flex gap-2 mt-2 flex-wrap">
              <TextInput
                value={companyDraft}
                onChange={e => setCompanyDraft(e.target.value)}
                placeholder="Company name"
                style={{ flex: '1 1 160px', width: 'auto' }}
                onKeyDown={e => e.key === 'Enter' && handleAddCompany()}
              />
              <TextInput
                value={urlDraft}
                onChange={e => setUrlDraft(e.target.value)}
                placeholder="Careers / job board URL (optional)"
                style={{ flex: '2 1 220px', width: 'auto' }}
                onKeyDown={e => e.key === 'Enter' && handleAddCompany()}
              />
              <Button onClick={handleAddCompany} disabled={adding || !companyDraft.trim()}>
                {adding ? 'Checking…' : 'Add'}
              </Button>
            </div>
            {addMsg && (
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--iven-muted)' }}>
                {addMsg}
              </div>
            )}
          </div>

          {/* Links */}
          <div>
            <SectionHeader icon={<Link2 size={13} />} title="Boards & links to browse" />
            <div className="flex flex-col gap-1 mb-2">
              {area.links.map((l, i) => (
                <div key={`${l.url}-${i}`} className="flex items-center gap-2 text-[12px]">
                  <a href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate" style={{ color: 'var(--iven-text)' }}>
                    <ExternalLink size={11} style={{ color: 'var(--iven-muted)' }} /> {l.label}
                  </a>
                  <button
                    onClick={() => onPatch({ links: area.links.filter((_, j) => j !== i) })}
                    style={{ color: 'var(--iven-muted)' }}
                    aria-label={`Remove ${l.label}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {area.links.length === 0 && (
                <span className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>
                  Niche job boards, club resources, lab pages: anything you check by hand.
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <TextInput
                value={linkLabel}
                onChange={e => setLinkLabel(e.target.value)}
                placeholder="Label"
                style={{ flex: '1 1 140px', width: 'auto' }}
              />
              <TextInput
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://…"
                style={{ flex: '2 1 220px', width: 'auto' }}
                onKeyDown={e => e.key === 'Enter' && isUrl(linkUrl) && addLink()}
              />
              <Button variant="ghost" onClick={addLink} disabled={!isUrl(linkUrl)}>
                Add Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function TargetList({
  targets,
  areas,
  onPatch,
  onRemove,
}: {
  targets: Target[]
  areas?: FocusArea[]
  onPatch: (id: string, p: Partial<Target>) => Promise<void>
  onRemove: (t: Target) => void
}) {
  if (targets.length === 0) {
    return (
      <div className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>
        No companies yet. Add one below or ask for suggestions.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      {targets
        .slice()
        .sort((a, b) => a.company.localeCompare(b.company))
        .map(t => (
          <TargetRow key={t.id} target={t} areas={areas} onPatch={onPatch} onRemove={onRemove} />
        ))}
    </div>
  )
}

function TargetRow({
  target: t,
  areas,
  onPatch,
  onRemove,
}: {
  target: Target
  areas?: FocusArea[]
  onPatch: (id: string, p: Partial<Target>) => Promise<void>
  onRemove: (t: Target) => void
}) {
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState(t.careers_url ?? '')
  const [checking, setChecking] = useState(false)
  const hasBoard = !!(t.ats_platform && t.ats_slug)
  const boardUrl =
    t.ats_platform === 'greenhouse'
      ? `https://job-boards.greenhouse.io/${t.ats_slug}`
      : t.ats_platform === 'lever'
        ? `https://jobs.lever.co/${t.ats_slug}`
        : t.ats_platform === 'ashby'
          ? `https://jobs.ashbyhq.com/${t.ats_slug}`
          : null
  const link = boardUrl ?? t.careers_url

  async function saveUrl() {
    setChecking(true)
    try {
      const board = await detectBoard(t.company, url.trim() || undefined)
      await onPatch(t.id, {
        careers_url: url.trim() || null,
        ats_platform: board?.platform ?? t.ats_platform,
        ats_slug: board?.slug ?? t.ats_slug,
        active: board ? true : t.active,
      })
      setEditing(false)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'var(--iven-bg)', border: '1px solid var(--iven-grid)' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[13px] font-medium" style={{ color: 'var(--iven-text)' }}>{t.company}</span>
        {hasBoard ? (
          <Pill color={t.active ? GREEN : 'var(--iven-muted)'}>
            {ATS_LABELS[t.ats_platform!]} · {t.active ? 'auto-scan' : 'paused'}
          </Pill>
        ) : (
          <Pill color="#A8743B">manual check</Pill>
        )}
        {link && (
          <a href={link} target="_blank" rel="noreferrer" style={{ color: 'var(--iven-muted)' }} title="Open job board">
            <ExternalLink size={12} />
          </a>
        )}
        <div className="flex-1" />
        {areas && areas.length > 0 && (
          <select
            value=""
            onChange={e => e.target.value && onPatch(t.id, { focus_area_id: e.target.value })}
            className="font-mono text-[10px] rounded-md px-1.5 py-1 cursor-pointer"
            style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-border)', color: 'var(--iven-muted)' }}
          >
            <option value="">Move to…</option>
            {areas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
        {hasBoard && (
          <button
            onClick={() => onPatch(t.id, { active: !t.active })}
            className="font-mono text-[9px] font-semibold tracking-[1px] uppercase"
            style={{ color: 'var(--iven-muted)' }}
          >
            {t.active ? 'Pause' : 'Resume'}
          </button>
        )}
        <button
          onClick={() => setEditing(e => !e)}
          className="font-mono text-[9px] font-semibold tracking-[1px] uppercase"
          style={{ color: 'var(--iven-muted)' }}
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
        <button onClick={() => onRemove(t)} style={{ color: 'var(--iven-muted)' }} aria-label={`Remove ${t.company}`}>
          <X size={13} />
        </button>
      </div>
      {editing && (
        <div className="flex gap-2 mt-2">
          <TextInput
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Careers or Greenhouse/Lever/Ashby board URL"
            onKeyDown={e => e.key === 'Enter' && saveUrl()}
          />
          <Button onClick={saveUrl} disabled={checking}>
            {checking ? 'Checking…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}

function Card({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)', opacity: dim ? 0.7 : 1 }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, noMargin }: { icon: React.ReactNode; title: string; noMargin?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${noMargin ? '' : 'mb-2'}`}>
      <span style={{ color: 'var(--iven-muted)' }}>{icon}</span>
      <span className="font-mono text-[10px] font-semibold tracking-[1.5px] uppercase" style={{ color: 'var(--iven-accent)' }}>
        {title}
      </span>
    </div>
  )
}
