'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ExternalLink,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type { PortfolioProjectRow, ProjectFact, ProjectImage, ProjectLink } from '@/types/portfolio'
import {
  deletePortfolioProject,
  fetchPortfolioProjects,
  removePortfolioImage,
  reorderPortfolioProjects,
  revalidatePortfolio,
  savePortfolioProject,
  uploadPortfolioImage,
  type ProjectDraft,
} from '@/lib/public-view/supabase'
import { portfolioMediaUrl, slugify, SLUG_PATTERN } from '@/lib/portfolio/media'
import { resizeForUpload } from '@/lib/stylemate/resize'
import Markdown from '@/components/portfolio/Markdown'

const EMPTY_DRAFT: ProjectDraft = {
  slug: '',
  title: '',
  eyebrow: '',
  summary: '',
  tags: [],
  link_label: 'Read write-up',
  facts: [],
  body: '',
  cover_path: null,
  gallery: [],
  links: [],
  sort_order: 0,
  published: false,
}

// Markdown's colors are --pf-* tokens from the public site; map them onto the
// IVEN palette so the preview matches the shell instead of the portfolio.
const PREVIEW_VARS = {
  '--pf-text': 'var(--iven-text)',
  '--pf-muted': 'var(--iven-text)',
  '--pf-accent': 'var(--iven-accent)',
  '--pf-accent-text': 'var(--iven-accent)',
  '--pf-card': 'var(--iven-bg)',
  '--pf-line': 'var(--iven-grid)',
} as CSSProperties

type Editing = { id: string | null; draft: ProjectDraft }

export default function ProjectsEditor({ supabase }: { supabase: SupabaseClient }) {
  const [rows, setRows] = useState<PortfolioProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)

  const load = useCallback(async () => {
    try {
      setRows(await fetchPortfolioProjects(supabase))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load projects')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    ;[next[index], next[target]] = [next[target], next[index]]
    setRows(next)
    await reorderPortfolioProjects(supabase, next.map(r => r.id))
    await revalidatePortfolio()
  }

  if (editing) {
    return (
      <ProjectForm
        supabase={supabase}
        editing={editing}
        existingSlugs={rows.filter(r => r.id !== editing.id).map(r => r.slug)}
        onClose={async changed => {
          setEditing(null)
          if (changed) await load()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-[760px]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px]" style={{ color: 'var(--iven-muted)' }}>
          Published projects appear as cards in Selected Work, in this order, and each gets a page at
          /work/&lt;slug&gt;.
        </p>
        <button
          onClick={() =>
            setEditing({
              id: null,
              draft: { ...EMPTY_DRAFT, sort_order: (rows.at(-1)?.sort_order ?? -10) + 10 },
            })
          }
          className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px] px-3 py-2 rounded"
          style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}
        >
          <Plus size={13} /> New project
        </button>
      </div>

      {error && (
        <p className="text-[13px]" style={{ color: '#B4532A' }}>
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--iven-muted)' }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--iven-muted)' }}>
          No projects yet.
        </p>
      ) : (
        <ul
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--iven-grid)', background: 'var(--iven-surface)' }}
        >
          {rows.map((row, i) => (
            <li
              key={row.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i ? '1px solid var(--iven-grid)' : undefined }}
            >
              <div className="flex flex-col">
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={13} />
                </IconButton>
                <IconButton label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={13} />
                </IconButton>
              </div>
              {row.cover_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={portfolioMediaUrl(row.cover_path)}
                  alt=""
                  className="w-14 h-10 rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-10 rounded shrink-0" style={{ background: 'var(--iven-bg)' }} />
              )}
              <button className="flex-1 min-w-0 text-left" onClick={() => setEditing({ id: row.id, draft: toDraft(row) })}>
                <div className="text-[14px] font-medium truncate" style={{ color: 'var(--iven-text)' }}>
                  {row.title}
                </div>
                <div className="font-mono text-[11px] truncate" style={{ color: 'var(--iven-muted)' }}>
                  /work/{row.slug}
                </div>
              </button>
              <span
                className="font-mono text-[10px] uppercase tracking-[1px] px-2 py-1 rounded"
                style={
                  row.published
                    ? { background: 'var(--iven-accent)', color: '#2C1F0E' }
                    : { border: '1px solid var(--iven-grid)', color: 'var(--iven-muted)' }
                }
              >
                {row.published ? 'Live' : 'Draft'}
              </span>
              <button
                onClick={() => setEditing({ id: row.id, draft: toDraft(row) })}
                className="font-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded"
                style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function toDraft(row: PortfolioProjectRow): ProjectDraft {
  return {
    slug: row.slug,
    title: row.title,
    eyebrow: row.eyebrow,
    summary: row.summary,
    tags: row.tags ?? [],
    link_label: row.link_label,
    facts: row.facts ?? [],
    body: row.body,
    cover_path: row.cover_path,
    gallery: row.gallery ?? [],
    links: row.links ?? [],
    sort_order: row.sort_order,
    published: row.published,
  }
}

function ProjectForm({
  supabase,
  editing,
  existingSlugs,
  onClose,
}: {
  supabase: SupabaseClient
  editing: Editing
  existingSlugs: string[]
  onClose: (changed: boolean) => void
}) {
  const [draft, setDraft] = useState<ProjectDraft>(editing.draft)
  const [tagsText, setTagsText] = useState(editing.draft.tags.join(', '))
  const [slugTouched, setSlugTouched] = useState(editing.id !== null)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState<'save' | 'upload' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Files uploaded in this session (removed if the edit is discarded) and saved
  // files the owner removed (deleted from storage only once the save lands).
  const newUploads = useRef<string[]>([])
  const pendingRemovals = useRef<string[]>([])
  const coverInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  const set = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  const slugError = useMemo(() => {
    if (!draft.slug) return 'Required'
    if (!SLUG_PATTERN.test(draft.slug)) return 'Lowercase letters, numbers and single dashes only'
    if (existingSlugs.includes(draft.slug)) return 'Another project already uses this slug'
    return null
  }, [draft.slug, existingSlugs])

  const canSave = draft.title.trim() && !slugError && busy === null

  function dropImage(path: string) {
    if (newUploads.current.includes(path)) {
      newUploads.current = newUploads.current.filter(p => p !== path)
      removePortfolioImage(supabase, path)
    } else {
      pendingRemovals.current.push(path)
    }
  }

  async function upload(files: FileList | null, kind: 'cover' | 'gallery') {
    if (!files?.length) return
    setBusy('upload')
    setError(null)
    try {
      const folder = draft.slug || 'untitled'
      for (const file of Array.from(files)) {
        // Re-encoding through a canvas also strips EXIF, including phone GPS tags.
        const path = await uploadPortfolioImage(supabase, folder, await resizeForUpload(file))
        newUploads.current.push(path)
        if (kind === 'cover') {
          if (draft.cover_path) dropImage(draft.cover_path)
          setDraft(d => ({ ...d, cover_path: path }))
          break
        }
        setDraft(d => ({ ...d, gallery: [...d.gallery, { path, caption: '' }] }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    setBusy('save')
    setError(null)
    try {
      const clean: ProjectDraft = {
        ...draft,
        title: draft.title.trim(),
        eyebrow: draft.eyebrow.trim(),
        summary: draft.summary.trim(),
        link_label: draft.link_label.trim() || 'Read write-up',
        tags: tagsText
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        facts: draft.facts.filter(f => f.label.trim() && f.value.trim()),
        links: draft.links.filter(l => l.label.trim() && /^https?:\/\//.test(l.url.trim())),
      }
      await savePortfolioProject(supabase, editing.id, clean)
      if (pendingRemovals.current.length) {
        await Promise.all(pendingRemovals.current.map(p => removePortfolioImage(supabase, p)))
      }
      newUploads.current = []
      await revalidatePortfolio()
      onClose(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setBusy(null)
    }
  }

  async function discard() {
    await Promise.all(newUploads.current.map(p => removePortfolioImage(supabase, p)))
    onClose(false)
  }

  async function remove() {
    if (!editing.id) return
    if (!window.confirm(`Delete “${draft.title}”? This removes its page and photos.`)) return
    setBusy('delete')
    try {
      await deletePortfolioProject(supabase, { ...draft, id: editing.id } as PortfolioProjectRow)
      await Promise.all(
        [...newUploads.current, ...pendingRemovals.current].map(p => removePortfolioImage(supabase, p))
      )
      await revalidatePortfolio()
      onClose(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[760px]">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={discard}
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px]"
          style={{ color: 'var(--iven-muted)' }}
        >
          <ArrowLeft size={13} /> All projects
        </button>
        {editing.id && editing.draft.published && (
          <a
            href={`/work/${editing.draft.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px]"
            style={{ color: 'var(--iven-muted)' }}
          >
            <ExternalLink size={13} /> View page
          </a>
        )}
      </div>

      <Panel title="Card">
        <Field label="Title">
          <TextInput
            value={draft.title}
            onChange={v => {
              set('title', v)
              if (!slugTouched) set('slug', slugify(v))
            }}
            placeholder="Mars Rover Spectrometer HAT"
          />
        </Field>
        <Field label="Slug (page address)" error={slugError}>
          <TextInput
            value={draft.slug}
            onChange={v => {
              setSlugTouched(true)
              set('slug', v.toLowerCase())
            }}
            placeholder="mars-rover-spectrometer-hat"
          />
        </Field>
        <Field label="Label line" hint="Shown above the title, e.g. Boiler Robotics · Fall 2026 · In progress">
          <TextInput value={draft.eyebrow} onChange={v => set('eyebrow', v)} />
        </Field>
        <Field label="Summary" hint="One or two sentences for the card and the top of the page.">
          <TextArea value={draft.summary} onChange={v => set('summary', v)} rows={3} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tags" hint="Comma separated">
            <TextInput value={tagsText} onChange={setTagsText} placeholder="KiCad, PCB design" />
          </Field>
          <Field label="Card link text">
            <TextInput value={draft.link_label} onChange={v => set('link_label', v)} placeholder="Read write-up" />
          </Field>
        </div>
        <Field label="Cover photo" hint="Optional. Without one, the card shows a blueprint panel.">
          <div className="flex items-center gap-3">
            {draft.cover_path && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={portfolioMediaUrl(draft.cover_path)} alt="" className="h-20 w-36 rounded object-cover" />
                <button
                  type="button"
                  aria-label="Remove cover photo"
                  onClick={() => {
                    dropImage(draft.cover_path!)
                    set('cover_path', null)
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--iven-text)', color: 'var(--iven-bg)' }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <SmallButton onClick={() => coverInput.current?.click()} disabled={busy !== null}>
              <ImagePlus size={13} /> {draft.cover_path ? 'Replace' : 'Upload'}
            </SmallButton>
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              hidden
              onChange={e => {
                upload(e.target.files, 'cover')
                e.target.value = ''
              }}
            />
          </div>
        </Field>
      </Panel>

      <Panel title="Quick facts">
        <p className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>
          Shown in a row under the title on the project page (Role, Team, Timeline…). Four reads best.
        </p>
        <PairList<ProjectFact>
          items={draft.facts}
          onChange={v => set('facts', v)}
          keys={['label', 'value']}
          placeholders={['Role', 'PCB designer']}
          empty={{ label: '', value: '' }}
          addLabel="Add fact"
        />
      </Panel>

      <Panel
        title="Write-up"
        right={
          <button
            type="button"
            onClick={() => setPreview(p => !p)}
            className="font-mono text-[10px] uppercase tracking-[1px]"
            style={{ color: 'var(--iven-accent)' }}
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
        }
      >
        {preview ? (
          <div className="rounded p-4" style={{ ...PREVIEW_VARS, background: 'var(--iven-bg)' }}>
            <Markdown source={draft.body} />
          </div>
        ) : (
          <>
            <p className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>
              ## Heading · ### Subheading · - bullet · 1. step · **bold** · *italic* · `code` · [text](https://…)
            </p>
            <TextArea value={draft.body} onChange={v => set('body', v)} rows={18} mono />
          </>
        )}
      </Panel>

      <Panel title="Photo gallery">
        <div className="grid sm:grid-cols-2 gap-3">
          {draft.gallery.map((img, i) => (
            <div key={img.path} className="flex flex-col gap-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={portfolioMediaUrl(img.path)} alt="" className="w-full aspect-[4/3] rounded object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => {
                    dropImage(img.path)
                    set(
                      'gallery',
                      draft.gallery.filter((_, j) => j !== i)
                    )
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--iven-text)', color: 'var(--iven-bg)' }}
                >
                  <X size={12} />
                </button>
              </div>
              <TextInput
                value={img.caption}
                onChange={v =>
                  set(
                    'gallery',
                    draft.gallery.map((g, j): ProjectImage => (j === i ? { ...g, caption: v } : g))
                  )
                }
                placeholder="Caption"
              />
            </div>
          ))}
        </div>
        <div>
          <SmallButton onClick={() => galleryInput.current?.click()} disabled={busy !== null}>
            {busy === 'upload' ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} Add photos
          </SmallButton>
          <input
            ref={galleryInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={e => {
              upload(e.target.files, 'gallery')
              e.target.value = ''
            }}
          />
        </div>
      </Panel>

      <Panel title="Links">
        <PairList<ProjectLink>
          items={draft.links}
          onChange={v => set('links', v)}
          keys={['label', 'url']}
          placeholders={['GitHub repo', 'https://…']}
          empty={{ label: '', url: '' }}
          addLabel="Add link"
        />
      </Panel>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={draft.published} onChange={e => set('published', e.target.checked)} />
        <span className="text-[13px]" style={{ color: 'var(--iven-text)' }}>
          Published: show this project on the public site
        </span>
      </label>

      {error && (
        <p className="text-[13px]" style={{ color: '#B4532A' }}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!canSave}
          className="font-mono text-[11px] uppercase tracking-[1px] px-4 py-2 rounded disabled:opacity-50"
          style={{ background: 'var(--iven-accent)', color: '#2C1F0E' }}
        >
          {busy === 'save' ? (
            <span className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Saving
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Check size={13} /> Save project
            </span>
          )}
        </button>
        <button
          onClick={discard}
          disabled={busy !== null}
          className="font-mono text-[11px] uppercase tracking-[1px] px-4 py-2 rounded"
          style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
        >
          Cancel
        </button>
        {editing.id && (
          <button
            onClick={remove}
            disabled={busy !== null}
            className="ml-auto flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px] px-3 py-2 rounded"
            style={{ color: '#B4532A' }}
          >
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>
    </div>
  )
}

function PairList<T extends { [K in keyof T]: string }>({
  items,
  onChange,
  keys,
  placeholders,
  empty,
  addLabel,
}: {
  items: T[]
  onChange: (items: T[]) => void
  keys: [keyof T & string, keyof T & string]
  placeholders: [string, string]
  empty: T
  addLabel: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
          {keys.map((k, ki) => (
            <TextInput
              key={k}
              value={item[k]}
              onChange={v => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)))}
              placeholder={placeholders[ki]}
            />
          ))}
          <IconButton label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X size={13} />
          </IconButton>
        </div>
      ))}
      <div>
        <SmallButton onClick={() => onChange([...items, { ...empty }])}>
          <Plus size={13} /> {addLabel}
        </SmallButton>
      </div>
    </div>
  )
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--iven-surface)', border: '1px solid var(--iven-grid)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--iven-accent)' }}>
          {title}
        </div>
        {right}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-mono uppercase tracking-[1px]" style={{ color: 'var(--iven-muted)' }}>
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-[12px]" style={{ color: '#B4532A' }}>
          {error}
        </span>
      ) : (
        hint && (
          <span className="text-[12px]" style={{ color: 'var(--iven-muted)' }}>
            {hint}
          </span>
        )
      )}
    </div>
  )
}

const inputStyle: CSSProperties = {
  background: 'var(--iven-bg)',
  border: '1px solid var(--iven-grid)',
  color: 'var(--iven-text)',
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[13px] px-3 py-2 rounded outline-none"
      style={inputStyle}
    />
  )
}

function TextArea({
  value,
  onChange,
  rows,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  rows: number
  mono?: boolean
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      className={`w-full text-[13px] leading-relaxed px-3 py-2 rounded outline-none resize-y ${mono ? 'font-mono' : ''}`}
      style={inputStyle}
    />
  )
}

function SmallButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded disabled:opacity-50"
      style={{ border: '1px solid var(--iven-grid)', color: 'var(--iven-text)' }}
    >
      {children}
    </button>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded disabled:opacity-30"
      style={{ color: 'var(--iven-muted)' }}
    >
      {children}
    </button>
  )
}
