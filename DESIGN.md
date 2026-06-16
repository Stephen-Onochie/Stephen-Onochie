# DESIGN.md

Design language reference for `stephenonochie.com` — the public portfolio and private app suite.

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `beige` | `#F5F0E8` | Primary background |
| `surface` | `#EDE8DC` | Card / secondary background |
| `gold` | `#C9A84C` | Primary accent, interactive states, borders |
| `goldLight` | `#E2C97E` | Softer accent, card borders at rest |
| `brownAccent` | `#6B4F2A` | Hover state on gold text/links |
| `textPrimary` | `#2C1F0E` | Body text |
| `textMuted` | `#8C7355` | Secondary / meta text |
| `grid` | `#B8A48E` | Borders, dividers, column separators |

**Native Clock dark mode** overrides these with warmer dark tokens:

| Role | Hex |
|------|-----|
| Background | `#14100C` |
| Surface | `#221A12` |
| Border | `#4A3D2A` |
| Text | `#F5F0E8` |
| Muted | `#A89478` |
| Accent | `#E2C97E` |
| Grid | `#2E261C` |

---

## Typography

| Role | Font | Style |
|------|------|-------|
| Display / H1 | Inter (display var) | `clamp(3rem, 12vw, 7.5rem)`, uppercase, `leading-[0.9]`, tight tracking |
| Headings | Playfair Display | `text-xl` – `text-3xl`, bold |
| Body | Inter | `text-sm` – `text-base`, `leading-relaxed` |
| UI labels / meta | Monospace | `text-[10px]` – `text-xs`, uppercase, `tracking-[0.2em–0.4em]` |
| Secondary / muted | Inter | `text-textMuted`, smaller |

**Rule:** Mono is reserved for meta information — counts, timestamps, labels, terminal-style content. Playfair is for editorial headings. Inter handles everything else.

---

## Spacing

- **Card padding:** `p-6` (sm) → `p-8` (md)
- **Section gaps:** `gap-3` – `gap-4` inline; `mb-4` – `mb-8` vertical rhythm
- **Page padding:** `px-4` → `px-8` (md+)

---

## Borders & Radius

- **Dividers:** `border-grid` (1px) — used heavily for column/row separation
- **Accent borders:** `border-gold` on interactive cards, `border-goldLight` at rest
- **Cards:** `rounded-2xl`
- **Buttons / inputs:** `rounded-lg`
- **Images:** `rounded-xl`

The grid border color (`#B8A48E`) is the workhorse — nearly all spatial separation comes from 1px borders rather than shadows or background contrast.

---

## Component Patterns

### Cards
- `bg-surface`, `border-goldLight`, `rounded-2xl`, `p-6`
- Hover: `border-gold`, optional `shadow-lg`
- Headings: `font-playfair font-bold text-textPrimary`
- Meta: `font-inter text-xs text-textMuted`

### Buttons
- Primary: `bg-gold text-textPrimary`, `rounded-lg`
- Toggle active: `bg-gold text-textPrimary`
- Toggle inactive: `text-textMuted hover:text-textPrimary`
- Transitions: `200ms` on color, border, background

### Inputs / Selects
- `border-goldLight` → `border-gold` on focus
- `bg-beige text-textPrimary`
- No outline ring — border color change is the focus indicator
- `px-3 py-2`, `rounded-lg`, `min-h-[36px]`

### Labels / Badges
- Uppercase mono, `text-[10px]`, `tracking-[0.2em+]`, `text-gold`
- Badge: `bg-gold text-white text-xs font-medium px-2 py-0.5 rounded-full`

### Section Headers
- Small uppercase mono label above → large display/playfair heading below
- Divider: `h-px bg-grid` between label and content

---

## Layout

- **Grid system:** 12-column CSS grid on the portfolio page; Tailwind responsive grid (`sm:grid-cols-2`, `lg:grid-cols-4`) in app layouts
- **Sidebar / header:** 3-column grid `[auto, 1fr, auto]` in the site header
- **App cards:** `grid-cols-2 gap-3` (mobile) → up to 4 columns (desktop)
- **Column separation:** `border-r border-grid` rather than gutters
- **Min heights:** Cards ~320px

---

## Animation & Motion

- **Portfolio ticker:** 40s linear infinite horizontal scroll, pauses on hover (`portfolio-ticker` keyframe)
- **Skeleton loading:** `animate-pulse` (StyleMate card placeholders)
- **Interactive transitions:** `200ms` ease on color, border-color, background-color
- No entrance animations — content is static, interaction is the motion layer

---

## Viewport theme

- Theme color meta: `#C9A84C` (gold) — used for mobile browser chrome
- No zoom (`maximum-scale: 1`)
- `scroll-behavior: smooth` globally

---

## Aesthetic Summary

Warm editorial minimalism — beige and gold with clean grid-based structure. The palette reads as warm and personal rather than corporate. Borders do the heavy lifting for spatial hierarchy instead of shadows or heavy backgrounds. Typography mixes Playfair's elegance with Inter's utility and Mono's technical precision. Interactions are subtle (color shifts, border upgrades) and fast (200ms). Nothing bounces or slides dramatically — the site feels settled and confident.
