# FreQ Design System (M15 Foundation)

Reusable visual language for the M16+ screen-by-screen redesign. All tokens
live in `ui.theme`; all primitives in `ui.components` (`Freq*`).

## Entry point

`FreqTheme { ... }` (replaces the old `WAVETheme`). Follows the system theme
by default; pass `darkTheme` explicitly for previews or pinned surfaces.
`FreqTheme.colors` exposes the active `FreqColors` palette.

## Color roles (`FreqColor.kt`)

Foundation: `background`, `backgroundElevated`, `surface`, `surfaceElevated`.
Glass: `glassSubtle/Standard/Strong/Floating` fills, `glassBorder`,
`glassBorderStrong`, `glassHighlight`.
Accents: `accentPrimary` (cyan), `accentSecondary` (violet),
`accentTertiary` (teal), `accentPink`, `onAccent` (button-label ink).
Text/icons: `textPrimary/Secondary/Muted`, `iconPrimary/Secondary`.
Functional: `success/warning/error/disabled`.
Atmosphere: `atmospherePrimary/Secondary` washes, `scrim`.

Dark is cinematic deep blue-violet, never plain black. Light is an
independent luminous cool-white design, not an inversion. Every text role
clears WCAG AA (4.5) on its background in both themes (`FreqContrastTest`).

`Color.kt` keeps only artwork-palette constants (cyan/violet/teal) used for
gradient fallbacks — artwork colors intentionally do not re-tint per theme.

## Glass (`FreqGlass.kt`, `FreqGlassSurface.kt`)

Four tones — Subtle < Standard < Strong < Floating — each resolving fill,
border, highlight, and shadow from the active palette (`glassStyleFor`,
unit-tested for ordering). Hierarchy: solid backgrounds → atmospheric wash
→ structural surfaces → glass → floating/modal.

Deliberately NO backdrop blur: Compose has no backdrop-blur primitive, and
capture-based frosted glass costs a full extra composition pass per surface.
The layered recipe (tonal fill + 1dp luminous border + top highlight wash +
soft shadow) reads as glass at a fraction of the cost on every API level.

## Artwork atmosphere (`FreqAtmosphere.kt`)

`ambientColorsFor` picks two washed colors from a track palette (capped at
28% opacity, falls back to theme washes for dark/missing art; unit-tested).
`rememberAmbientWash` builds the remembered background brush; `vignetteBrush`
adds edge depth; `readabilityScrim` sits behind text over artwork.

## Typography (`FreqTypography.kt`)

FreQ scale on Material3 slot names (screens keep working untouched):
display → displayLarge/Medium/Small; screenTitle → headlineLarge/Medium;
section/cardTitle → titleLarge/Medium; body → bodyLarge/Medium/Small;
caption/metadata → labelMedium/Small; button/nav labels → labelLarge/titleSmall.
All `sp` — system font scaling keeps working. `Type.kt` is a legacy alias.

## Spacing / shapes / elevation / motion

- `FreqSpacing`: 4dp base scale plus semantic aliases (`screenEdge`,
  `sectionGap`, `cardPadding`, `miniPlayerClearance`, …) and the artwork
  ladder. Touch targets: 48dp standard, 44dp dense.
- `FreqShapes`: chips/buttons pill, cards 16dp, large/floating 20dp,
  artwork 12dp, sheets 28dp top, dialogs 24dp.
- `FreqElevation`: soft short shadows (glass glows rather than lifts).
- `FreqMotion`: 120ms press, 180ms fade, 260ms morph, 220ms artwork fade.

## Responsive (`FreqResponsive.kt`)

Phones only (foldables out of scope). `contentMaxWidth` 720dp centers wide
content; compact (<360dp) tightens edge padding and rail cards; short
(<640dp) screens shrink hero artwork. `rememberScreenSize()` for
configuration-aware reads.

## Components (`ui.components`, `Freq*`)

`FreqGlassSurface` (core), `FreqPrimaryButton`/`FreqGhostButton`/
`FreqIconButton` (48/44dp targets), `FreqChip`, `FreqSectionHeader`,
`FreqLoadingState`/`FreqEmptyState`/`FreqErrorState`, `FreqDialogSurface`,
`FreqArtwork` (Coil, auto-sized decode, gradient fallback), `FreqBackground`,
`FreqArtworkPlayBadge`. Mini player and bottom bar are rebuilt on these
primitives with unchanged layout and behavior.

## Rules for M16+

- Colors/spacing/shapes/radii come from tokens; no screen-local hex or dp
  for chrome.
- Glass only where the hierarchy calls for it; floating surfaces stay
  near-opaque for readability.
- Light theme is first-class: verify every redesigned screen in both.
- No fake catalog/profile content — previews needing sample data must
  isolate it from production navigation (see M14).
