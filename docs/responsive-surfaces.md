# Responsive surfaces (laptop · phone · projector)

Research-backed rules VocabLab follows for classroom devices. Prefer primary sources over fashion blogs.

## Devices & jobs

| Surface | Primary job | Design priority |
|---------|-------------|-----------------|
| **Laptop** | Day-to-day teacher work (Chrome/Edge/Safari/Firefox) | Comfortable density, keyboard-friendly, no horizontal scroll |
| **Phone** | Build & edit vocabulary / lessons on the go | Large touch targets, visible actions (no hover-only), 16px+ inputs, safe-area, bottom sheets |
| **Projector** | Live wheel games for the class | Huge type, high contrast, wrap long words, chrome out of the way, score rail reserved correctly |

## Sources (rules of thumb)

- **Legibility at distance (AV):** Classroom “1/4 rule” / 8H presentation rules — text height must grow with viewing distance; small UI chrome fails at the back of the room. ([Commercial Integrator on 1/4 rule](https://www.commercialintegrator.com/insights/1-4-rule-solid-state-projection-classroom-displays/61741/); [Presentation Guild 8H](https://presentationguild.org/how-big-big-enough-the-8h-rule-reveals-all/))
- **Contrast:** WCAG ≥ 4.5:1 for normal text, ≥ 3:1 for large text / UI components.
- **Touch targets:** ≥ ~44×44 CSS px (Apple HIG / Android guidance). Prefer always-visible destructive actions on touch; use `@media (hover: hover)` for hover-only affordances.
- **Viewport:** `viewport-fit=cover` + `env(safe-area-inset-*)` ([Polypane safe-area](https://polypane.app/blog/using-safe-area-inset-to-build-mobile-safe-layouts/)); prefer `dvh`/`svh` with `vh` fallback ([web.dev / CSS Values 4 viewport units](https://web.dev/blog/viewport-units)).
- **Forms on mobile:** Inputs ≥ 16px to avoid iOS focus zoom; stack field grids under ~640px; sticky primary CTA for Add/Save.
- **Component layout:** Prefer content-driven breakpoints (`sm`/`md`/`lg`) and container queries where a card lives in multiple contexts ([web.dev container queries](https://web.dev/learn/css/container-queries)).

## VocabLab implementation map

- **Vocabulary (phone-critical):** `/vocabulary` — sticky filters, full-width selects, always-visible delete, bottom-sheet edit modal, floating Add on small screens, 16px fields.
- **Lesson / Create / Images:** Teacher Zone tools — no hover-only toolbars on touch; larger chips.
- **Wheel play (projector):** `--score-rail-width` when the left rail is shown; stage padding only when needed; allow wrap on long FR/EN; larger score + win type.
- **Shell:** AppChrome safe-area padding; compact Teacher Zone label on narrow widths.

## Browser bar

Target evergreen Chromium, Firefox, Safari (desktop + iOS). Do not depend on IE. Pair modern units (`dvh`) with `vh` fallbacks where heights matter.
