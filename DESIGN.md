# NAEIL visual system

NAEIL is one operational product with two field contexts. The interface should
feel dependable enough for field work and clear enough for a first-time youth
operator. Manufacturing and small-business screens share the same shell,
typography, status language, and interaction rules.

## Visual direction

- Calm operational clarity: light blue-gray canvas, white working surfaces,
  navy text, and blue reserved for selection or the next primary action.
- Human field context: use representative synthetic field imagery to explain the
  work, never as decoration that competes with controls.
- Evidence over spectacle: status, provenance, rights, and the responsible human
  decision should be easier to find than promotional claims.
- One screen, one primary action: secondary actions remain outlined or textual.

## Typography

The deployed build bundles Pretendard 1.3.9 from its npm package under the
SIL Open Font License 1.1. System fonts remain the fallback.

| Purpose | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Hero title | 38–52px | 29–30px | 820 |
| Page title | 32–38px | 24px | 800 |
| Section title | 24px | 22–24px | 750–800 |
| Card title | 18–22px | 18–20px | 700–800 |
| Body and controls | 15–17px | 15–17px | 450–750 |
| Evidence labels | 11–13px | 11–13px | 700–800 |

Korean copy uses short verb-led actions. Long explanation belongs below the
heading, not inside a button. English eyebrow labels identify system layers but
must not replace Korean task language.

## Color and surfaces

| Token | Value | Use |
|---|---|---|
| Ink | `#0F172A` | primary text |
| Muted | `#475569` | supporting text |
| Canvas | `#F4F7FB` | page background |
| Panel | `#FFFFFF` | working cards |
| Action | `#2563EB` | primary action and active state |
| Action strong | `#1D4ED8` | hover and emphasis |
| Success | `#166534` | confirmed human or workflow state |
| Warning | `#92400E` | incomplete gates and cautions |
| Danger | `#B91C1C` | blocked or failed action |

Cards use a 14–16px radius, a visible cool-gray boundary, and shallow layered
shadow. Strong shadow is limited to the main hero and career narrative panel.

## Layout

- Desktop shell: 240px navigation, 68px top bar, fluid content up to 1440px.
- Main content uses 16–24px card gaps and 24px internal padding.
- Hero screens pair one action-focused narrative with one field image.
- Operational detail screens use a wide work area plus a narrower context rail.
- Five-step lifecycle cards may connect horizontally on wide screens and become
  independent cards when space is constrained.
- Data tables become labelled record cards on narrow screens.

## Imagery

- Every field image shown in the prototype is labeled as an AI-generated
  synthetic example unless another verified source label is present.
- Images explain the current work object or environment. They do not contain
  embedded buttons, tables, or text that appears interactive.
- Hero images fill their frame; task and dataset images use bounded preview
  frames so they do not consume the whole desktop viewport.
- Empty review states may show a desaturated representative image, but must say
  that no record has been submitted.

## Status and truth boundaries

- AI review is an assistive signal and never receives an approval visual.
- Collection, independent review, dataset access, and compensation are separate
  visual axes.
- Synthetic simulation actions open a boundary explanation before doing
  anything. They do not imitate successful robot control, training, hiring,
  contracts, or payment.
- Prototype limitations remain visible without becoming the page's main visual
  headline.

## Responsive acceptance

- At 1440×900, the primary action and the next meaningful status should be
  visible without scrolling on home, task, review, dataset, and career screens.
- At 390×844 and 320px width, controls remain reachable and no page-level
  horizontal overflow is allowed.
- Touch actions are at least 44px high; primary mobile actions target 48px.
- The mobile menu provides a scrim, a close path, and returns focus correctly.
- Text enlargement, visible keyboard focus, reduced motion, and semantic heading
  order remain part of implementation review.

## Screenshot review loop

1. Capture home, task, review, dataset, career, and small-business home at the
   same desktop viewport.
2. Compare hierarchy, image ratio, card density, and the position of the next
   action before comparing decorative detail.
3. Repeat the same routes at a mobile viewport.
4. Re-run the full automated check and inspect browser console errors.
5. Refresh the five 16:9 submission screenshots only after the new visual system
   and core flows pass.
