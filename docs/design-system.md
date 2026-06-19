# Pixel Pocket Arcade, Design System

Status: ready to implement. Target stack: Tailwind v4 (`@theme` CSS variables) plus plain CSS. Theme is dark only. No image assets, no webfonts, no background music. No em dash characters appear in this document by design.

All contrast ratios below were computed with the WCAG 2.1 relative luminance formula (sRGB linearization, ratio = (L1 + 0.05) / (L2 + 0.05)). AA targets: 4.5:1 for normal text, 3:1 for large text (>=24px or >=18.66px bold) and for UI component boundaries and focus indicators.

---

## 1. Brand treatment (wordmark)

Concept: the title reads as three stacked or inline "tokens" styled like keycaps or a high-score nameplate. Built entirely from CSS and Unicode, no image.

- Wordmark text: `PIXEL POCKET ARCADE`, uppercase, set in the display (monospace) stack with `letter-spacing: 0.08em`.
- A small Unicode glyph sits before the wordmark as a mark: use a filled square `■` (U+25A0) or three blocks `▰▰▰` (U+25B0 region) tinted with the brand accent. Keep it decorative only, with `aria-hidden="true"`, since the visible word carries the name.
- Optional "coin slot" accent: a 2px brand-colored underline bar under `ARCADE` only, drawn with a bottom border, not a separate element.
- Color split for personality, applied per word with spans: `PIXEL` in `--text-primary`, `POCKET` in `--text-primary`, `ARCADE` in `--accent-brand`. This keeps most of the wordmark maximum contrast and lets one word glow.
- Rendering: render as an `<h1>` on the home page (one h1 per page). On inner game pages the wordmark drops to a smaller `--text-primary` lockup in the header and the game name becomes the page h1.
- Tone: confident, playful, retro, but legible first. No outline text, no drop-shadow stack on the wordmark itself (chunky shadows are reserved for buttons and cards). No animated glow on load.

Reference markup intent (lead implements):

```
<h1 class="wordmark">
  <span aria-hidden="true" class="wordmark__mark">■</span>
  <span class="wordmark__a">PIXEL</span>
  <span class="wordmark__b">POCKET</span>
  <span class="wordmark__c">ARCADE</span>
</h1>
```

---

## 2. Visual direction summary

Deliberately retro pixel arcade, executed with discipline:

- Dark layered surfaces (ink base, raised panels) so neon accents read as light sources without overwhelming.
- Restrained neon: one brand accent plus one accent per game. Accents are used for identity, focus, and state, not as large fills of body area.
- Crisp hierarchy: blocky monospace display type for titles and stats, clean system sans for all reading text.
- Pixel cues come from geometry (2px borders, small radii, hard offset shadows), not from a CRT filter. No scanline overlay, no chromatic aberration, nothing that lowers text contrast.
- Limited, purposeful motion. The interface should feel snappy and arcade-quick, never busy.
- Readability is the top priority. If a retro flourish would hurt legibility or contrast, it is dropped.

---

## 3. Color tokens

Define as CSS custom properties in `@theme`. Hex values are final.

### Background layers
| Token | Hex | Use |
|---|---|---|
| `--bg-base` | `#0B0E14` | App background, deepest layer |
| `--bg-surface` | `#141A24` | Cards, panels, default raised content |
| `--bg-raised` | `#1E2633` | Nested panels, inputs, hovered cards, board cells |

### Text
| Token | Hex | Use |
|---|---|---|
| `--text-primary` | `#F2F5F9` | Headings, body, primary labels |
| `--text-muted` | `#A7B0BE` | Secondary text, helper text, idle labels |
| `--text-inverse` | `#0B0E14` | Text and icons on filled accent buttons |

### Lines and feedback
| Token | Hex | Use |
|---|---|---|
| `--border` | `#2A3342` | Decorative dividers, subtle card edges (non-essential boundaries) |
| `--border-strong` | `#687486` | Interactive control outlines (secondary/ghost buttons, inputs, D-pad), meets 3:1 |
| `--focus-ring` | `#5CE0FF` | Focus indicator ring, all interactive elements |

### Accents (one brand plus three game accents, all visually distinct hues)
| Token | Hex | Hue | Use |
|---|---|---|---|
| `--accent-brand` | `#FF4D8D` | pink/magenta (~338) | Brand, primary CTA, wordmark highlight |
| `--accent-snake` | `#34E27A` | green (~145) | Snake game identity, success state |
| `--accent-memory` | `#3AC6F0` | cyan/azure (~196) | Memory Match identity, playing state |
| `--accent-reaction` | `#FFB02E` | amber (~40) | Reaction Timer identity, paused/warning state |
| `--accent-danger` | `#FF5A5A` | red (~0) | Errors, destructive actions |

The four feature hues (pink 338, green 145, cyan 196, amber 40) are spread around the wheel for clear separation, and danger red sits apart from all four.

### Contrast ratios (computed, all pass AA)

Text and accent-as-text on each background layer (normal text needs 4.5:1):

| Foreground | on `--bg-base` | on `--bg-surface` | on `--bg-raised` |
|---|---|---|---|
| `--text-primary` #F2F5F9 | 17.7:1 | 16.0:1 | 13.9:1 |
| `--text-muted` #A7B0BE | 8.8:1 | 8.0:1 | 7.0:1 |
| `--accent-brand` #FF4D8D | 6.2:1 | 5.6:1 | 4.9:1 |
| `--accent-snake` #34E27A | 11.3:1 | 10.2:1 | 8.9:1 |
| `--accent-memory` #3AC6F0 | 9.7:1 | 8.7:1 | 7.6:1 |
| `--accent-reaction` #FFB02E | 10.6:1 | 9.6:1 | 8.3:1 |
| `--accent-danger` #FF5A5A | 6.3:1 | 5.7:1 | 5.0:1 |

Every text and accent-as-text pairing above clears 4.5:1 on every surface, so all pass AA for normal text (and therefore for large text too).

Inverse text on filled accent buttons (`--text-inverse` #0B0E14 on the accent fill, normal text needs 4.5:1):

| Button fill | Contrast of #0B0E14 text |
|---|---|
| `--accent-brand` #FF4D8D | 6.2:1 |
| `--accent-snake` #34E27A | 11.3:1 |
| `--accent-memory` #3AC6F0 | 9.7:1 |
| `--accent-reaction` #FFB02E | 10.6:1 |
| `--accent-danger` #FF5A5A | 6.3:1 |

All filled accent buttons use dark ink text (#0B0E14), which keeps the system consistent (dark legends on bright keycaps) and passes AA on every accent. Note: white text on these saturated fills would fail (for example white on brand pink is about 2.9:1), so dark ink is required, not optional.

UI component boundaries and focus (need 3:1):

| Element | on base | on surface | on raised |
|---|---|---|---|
| `--border-strong` #687486 (control outline) | 4.1:1 | 3.7:1 | 3.2:1 |
| `--focus-ring` #5CE0FF | 12.5:1 | 11.3:1 | 9.8:1 |

`--border` #2A3342 is intentionally low contrast (about 1.4:1 on surface) and is used only for decorative dividers and non-essential card edges, never as the sole indicator of an interactive boundary or a state. Anything interactive uses `--border-strong`, a fill, or text, plus the focus ring.

---

## 4. Typography

System and safe fonts only. No downloaded or web fonts. No tiny pixel font for body text.

### Stacks
```
--font-display: ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono",
                "Roboto Mono", Menlo, Consolas, "Courier New", monospace;

--font-body:    system-ui, -apple-system, "Segoe UI", Roboto,
                "Helvetica Neue", Arial, sans-serif;
```
`--font-display` is the blocky monospace feel for titles, the wordmark, and stat readouts. `--font-body` is the readable sans for everything users read.

### Type scale (16px root)
| Style | Font | Size | Weight | Line height | Letter spacing | Notes |
|---|---|---|---|---|---|---|
| h1 | display | `clamp(1.875rem, 4vw, 2.5rem)` (30 to 40px) | 700 | 1.15 | 0.02em | uppercase, one per page |
| h2 | display | `1.5rem` (24px) | 700 | 1.2 | 0.01em | section titles |
| h3 | display | `1.125rem` (18px) | 600 | 1.25 | 0.01em | subsection, card titles |
| body | body | `1rem` (16px) | 400 | 1.6 | normal | default reading text, 16px min |
| small | body | `0.875rem` (14px) | 400 | 1.5 | normal | helper text, captions |
| stat-label | display | `0.75rem` (12px) | 600 | 1.2 | 0.08em | uppercase, `--text-muted` |
| stat-value | display | `1.5rem` (24px) | 700 | 1.1 | normal | `font-variant-numeric: tabular-nums` |

Rules: body text never goes below 16px (avoids mobile auto-zoom and keeps reading comfortable). The smallest text in the system is the 12px uppercase stat label, which is a short non-reading label, not body copy. Use `tabular-nums` on every stat, score, and timer so digits do not shift width as they change. Body measure target: 60 to 75 characters on desktop, 35 to 60 on mobile.

---

## 5. Spacing, radius, borders, elevation, focus

### Spacing scale (4px base)
| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

Vertical rhythm tiers: 16 / 24 / 32 / 48 by hierarchy. Gutters: 16px mobile, 24px tablet, 32px desktop.

### Border radius (small, blocky, pixel feel)
| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 2px | badges, inputs, small chips |
| `--radius-md` | 4px | buttons, cards, panels (default) |
| `--radius-lg` | 6px | modals, large containers |
| `--radius-pill` | 9999px | sound toggle track only |

Keep radii small. Never round to `2xl` style values; that breaks the pixel character.

### Borders (pixel-inspired)
- Base interactive border: `2px solid var(--border-strong)`.
- Decorative divider: `1px solid var(--border)` or `2px solid var(--border)`.
- Chunky layered edge (the extruded pixel look) uses a hard offset shadow with zero blur, see elevation tokens.

### Elevation / shadow tokens (hard pixel edges, no glow)
| Token | Value | Use |
|---|---|---|
| `--shadow-pixel` | `0 2px 0 0 rgba(0,0,0,0.55)` | resting buttons, chips |
| `--shadow-raised` | `0 4px 0 0 rgba(0,0,0,0.55)` | cards, raised panels |
| `--shadow-modal` | `0 8px 28px -10px rgba(0,0,0,0.7)` | modals and sheets only |

Hard offset shadows give the chunky arcade edge. The single soft shadow is reserved for modal layering. No neon glow shadows anywhere (they reduce text contrast and add noise).

### Focus ring (high contrast, visible)
```
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: inherit;
}
```
2px ring plus 2px offset, color `--focus-ring` #5CE0FF (>=9.8:1 on every surface). Never remove focus outlines. If `outline` cannot follow the shape, use the box-shadow equivalent: `box-shadow: 0 0 0 2px var(--bg-base), 0 0 0 4px var(--focus-ring)`.

---

## 6. Responsive behavior

Mobile first. No horizontal page scroll at any width. Add `<meta name="viewport" content="width=device-width, initial-scale=1">` and never disable zoom.

### Breakpoints
| Name | Min width | Reference device |
|---|---|---|
| base | 0 | 375x667 mobile portrait |
| sm | 480px | large phones |
| md | 768px | 768x1024 tablet portrait |
| lg | 1024px | tablet landscape, small laptop |
| xl | 1280px+ | 1440x900 desktop |

### Layout intent
- Mobile portrait (375x667): single column. Home shows game cards stacked full width. In a game, layout is vertical: header, then the play area sized with `min(92vw, 92vw)` square via `aspect-ratio: 1`, then stats row, then the touch D-pad pinned near the bottom within the page (not overlapping the board). Page uses `min-height: 100dvh`. The play screen sets `overflow: hidden` on its scroll container and `overscroll-behavior: contain` so touch input on the board or D-pad never scrolls the page.
- Tablet (768x1024): home becomes a 2 column game grid. In a game, the board grows to `min(70vw, 70vh)` and stats move into a side or top panel. D-pad still available for touch; keyboard hints shown.
- Desktop (1440x900): home is a 3 column game grid inside a centered container, `max-width: 1120px`. In a game, the board centers with a stats panel to one side. D-pad is optional on desktop (keyboard is primary) but remains visible and usable.

### No-horizontal-scroll rules
- Container `max-width` plus `margin-inline: auto`, never fixed px widths wider than the viewport.
- Game board is always a square sized by `min()` of viewport units so it shrinks to fit the smallest screen.
- Any row of controls wraps or uses the D-pad layout rather than forcing width.
- Use `min-h-dvh` (not `100vh`) for full-height screens to respect mobile browser chrome.

---

## 7. Motion rules

Limited and purposeful. Motion conveys cause and effect (press, state change, entrance), never decoration for its own sake.

### Duration and easing tokens
| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | entrances, state changes |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | exits |
| `--dur-press` | `120ms` | button/card press feedback |
| `--dur-state` | `180ms` | hover, color/background state |
| `--dur-panel` | `240ms` | modal, panel, badge transitions |

Defaults: enter with `--ease-out`, exit with `--ease-in` and a slightly shorter duration (exits feel faster). Animate `transform` and `opacity` only, never `width`, `height`, `top`, or `left`. Press feedback is a subtle scale (0.97) plus the hard shadow shrinking from `--shadow-raised` to `--shadow-pixel`, so the button looks pressed into the board. Limit to one or two animated elements per view. No looping ambient animation. No neon pulse or glow animation.

### Reduced motion (full coverage)
Under `@media (prefers-reduced-motion: reduce)`, disable all of the following:

```
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Specifically disabled when reduced motion is on:
- All transitions (hover, press scale, color fades) collapse to effectively instant.
- All keyframe animations (skeleton pulse, badge entrance, any score tick animation) are stopped; show the final state immediately.
- The optional decorative background texture (see below) is disabled.
- Press feedback becomes a static color/border change instead of a scale transform.
- Game logic animations (snake step, card flip, timer flash) render as immediate state swaps; gameplay stays fully functional, just without tweening.

State that was communicated by motion is always also communicated by text, color, and icon, so nothing is lost when motion is off.

### Decorative texture (optional, safe)
If any texture is used, it is a single static low-contrast dot grid drawn with a CSS `radial-gradient` background at `opacity <= 0.04`, placed on `--bg-base` only, behind all content via a lower stacking layer. It never sits directly under text blocks, never lowers text contrast, and is removed under reduced motion. No scanline overlay, no CRT curvature, no moving texture. When in doubt, omit it.

---

## 8. Component patterns

All interactive components meet a 44x44 CSS px minimum target and have hover, active, focus, and disabled states. Disabled uses `opacity: 0.5`, `cursor: not-allowed`, and the appropriate disabled attribute, with no hover or press response.

### Button
Shared: `min-height: 44px; min-width: 44px; padding: 0 var(--space-4); border-radius: var(--radius-md); font: 600 1rem var(--font-body); touch-action: manipulation;`. Press: scale 0.97 over `--dur-press`, shadow shrinks `--shadow-raised` to `--shadow-pixel`.

| Variant | Resting | Hover | Active | Focus | Disabled |
|---|---|---|---|---|---|
| Primary | bg `--accent-brand`, text `--text-inverse`, `--shadow-raised` | brightness +6% | scale 0.97, `--shadow-pixel` | `--focus-ring` 2px + 2px offset | opacity 0.5, no shadow |
| Secondary | bg `--bg-raised`, text `--text-primary`, `2px solid --border-strong` | bg shifts toward `--bg-surface`, border lightens | scale 0.97 | focus ring | opacity 0.5 |
| Ghost | transparent, text `--text-primary`, no border | bg `rgba(255,255,255,0.06)` | scale 0.97 | focus ring | opacity 0.5 |
| Danger | bg `--accent-danger`, text `--text-inverse`, `--shadow-raised` | brightness +6% | scale 0.97 | focus ring | opacity 0.5 |

Each screen has one primary CTA; everything else is secondary or ghost. A game accent can tint the primary button on that game's screen (for example Snake screen primary uses `--accent-snake` with `--text-inverse`, still AA at 11.3:1).

### Card (home game card)
- Container: `bg --bg-surface; border: 2px solid --border; border-radius: --radius-md; box-shadow: --shadow-raised; padding: --space-5;`.
- Content: an h3 title in the game accent, one line of `--text-muted` description (body/small), and a high-contrast "Play" affordance.
- The whole card is one link/button (single tap target, well above 44px). Title uses the game accent so the three games are color-coded and labeled.
- Hover: border shifts to `--border-strong`, lifts via shadow only (no layout shift). Active: scale 0.98. Focus: focus ring on the card. Color is never the only cue; the game name text is always present.

### Panel / Surface
- `bg --bg-surface; border: 2px solid --border; border-radius: --radius-md; padding: --space-4 to --space-6;`. Nested panels step up to `--bg-raised`. Use panels for stats areas, settings, and modal bodies. Modal adds `--shadow-modal` and a scrim `rgba(0,0,0,0.6)` behind it.

### Status badge plus text (state never by color alone)
Pill: `border-radius: --radius-sm; padding: 2px var(--space-2); font: 600 0.75rem --font-display; letter-spacing: 0.06em; text-transform: uppercase;`. Each state carries an icon (Unicode or SVG) plus a text label plus color. Color is reinforcement only.

| State | Color token | Icon | Label text |
|---|---|---|---|
| Idle | `--text-muted` | `○` | IDLE |
| Playing | `--accent-memory` | `▸` | PLAYING |
| Paused | `--accent-reaction` | `‖` | PAUSED |
| Success | `--accent-snake` | `✓` | WIN / DONE |
| Error | `--accent-danger` | `!` | ERROR |

Badge style options: filled tint uses the accent at low alpha for the background (for example `color-mix(in srgb, var(--accent-memory) 16%, transparent)`) with the accent as text/border, keeping the label text itself at the accent color which is AA on the panel. Or a simpler outline badge: transparent background, `1px solid` accent, accent text. Either way the text label and icon make the state readable without color.

### Stat readout (label plus value)
- Label: stat-label style (12px uppercase, `--text-muted`, `letter-spacing: 0.08em`).
- Value: stat-value style (24px display, 700, `--text-primary`, `tabular-nums`).
- Layout: label above value, or label left and value right within a small panel. Use for score, high score, time, moves, best reaction. Tabular figures prevent width jitter as numbers change.

### Game-control pattern, touch D-pad
- Cross layout, four directional buttons. Each button is at least 56x56 px (well above the 44px minimum) with 8px gaps between adjacent buttons.
- Buttons: `bg --bg-raised; border: 2px solid --border-strong; border-radius: --radius-md; color --text-primary;`, arrow glyph centered. Active: scale 0.95 plus background shift toward the active game accent.
- The D-pad container sets `touch-action: none;` and its `pointerdown`/`touchstart` handlers call `preventDefault()` so directional taps and holds never scroll or zoom the page. The play screen container uses `overscroll-behavior: contain` and `overflow: hidden` as a second guard.
- Each button has an `aria-label` (Up, Down, Left, Right). On desktop, arrow keys and WASD mirror the D-pad; the visible D-pad remains a non-gesture alternative, so no action is gesture-only.
- A center "pause/start" button is optional within the cross; if present it also meets 56x56 and has a text/icon label.

### Sound toggle
- A labeled switch, 44px min height, with both an icon and a text or state label so it is not icon-only.
- Track: `--radius-pill`, `bg --bg-raised`, `2px solid --border-strong`. Thumb: 24px square-ish (`--radius-sm`), `--text-primary`.
- On state: track tint `--accent-brand` at low alpha, thumb to the right, `aria-pressed="true"` (or a checkbox `role="switch"` with `aria-checked`), label reads "Sound on". Off state: thumb left, label "Sound off", icon shows muted glyph. Focus: focus ring. The control communicates on/off via position, icon, and text, never color alone. Default to off-friendly: respect that there is no background music, this only governs short game sound effects.

---

## 9. Touch targets

- Minimum interactive size is 44x44 CSS px everywhere (buttons, toggle, cards, badges if interactive, nav links). Where a visual icon is smaller, expand the hit area with padding or an invisible hit slop so the tappable region is still at least 44x44.
- Minimum spacing between adjacent touch targets is 8px (`--space-2`). The D-pad uses 8px gaps with 56x56 buttons, comfortably clearing both the size and spacing minimums.
- Primary touch controls (D-pad, primary CTA) stay clear of the very top and bottom screen edges and any device safe area; reserve at least `--space-4` inset from screen edges on mobile.
- No control requires a pixel-precise tap; all primary actions have generous targets, and destructive actions (for example reset score) are separated spatially from frequent actions and use the danger variant plus a confirmation step.

---

## Implementation notes

- All tokens map cleanly to a Tailwind v4 `@theme` block as CSS variables (`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`, spacing via the default 4px scale). Components are plain CSS or Tailwind utilities referencing those variables.
- Single most important note: every filled accent button and badge must use `--text-inverse` (#0B0E14) dark ink, not white. White text fails AA on the bright accents; dark ink passes on all of them and is the intended arcade keycap look.
- Reduced motion is handled by one global media block plus removing the press-scale transform; gameplay never depends on animation.
- The only "texture" permitted is an optional static dot grid at opacity <= 0.04 behind content, disabled under reduced motion. No CRT or scanline overlay.
