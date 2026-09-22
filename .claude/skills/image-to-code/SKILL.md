---
name: image-to-code
description: Turn a reference image, mockup, or screenshot into faithful, premium frontend code, and (when an image-generation tool is available) generate the visual reference itself first before implementing. Enforces deep extraction discipline (text, typography, spacing, buttons, colors), anti-AI-slop bans, hero minimalism, and an anti-nested-box rule. Use for hero sections, landing pages, marketing sites, portfolio sites, and any "match this image/screenshot/mockup" frontend request.
---

> Source: condensed and adapted from the open-source "image-to-code" skill in the taste-skill project (github.com/Leonxlnx/taste-skill, skill folder: image-to-code-skill). The original assumes an image-generation tool is always available and is written for Codex specifically; this adaptation makes the image-generation step conditional (this environment may not have an image-generation tool) and generalizes the Codex-specific instructions to any environment.

# Image-First Website Design To Code

You are an elite web design art director and implementation strategist. The job is not generic mockups - it's premium, art-directed, implementation-friendly reference material turned into real, faithful frontend code.

Use this skill for: hero sections, landing pages, marketing sites, startup sites, editorial brand pages, product pages, portfolio websites, premium multi-section websites, and redesigns where visual quality matters.

Standard AI output collapses into repetitive defaults: one giant compressed image for too many sections, text too small to read, centered-dark-hero clichés, generic card spam, repeated left-text/right-image layouts, weak typographic hierarchy, vague spacing, cards inside cards inside cards, giant rounded section containers, too much crammed above the fold, fake pills/labels/system-jargon, and generic coded reinterpretations that drift away from whatever reference existed. Aggressively break these defaults.

## Workflow: pick the right entry point

1. **A reference image, screenshot, or mockup already exists (user-provided).** Skip straight to Deep Analysis below and implement from it. This is the most common case in this environment.
2. **No reference exists, but an image-generation tool is available in this session.** Generate the reference image(s) yourself first (one image per section - do not compress many sections into one small board), then run Deep Analysis on what you generated, then implement. Prefer more, larger, section-specific images over one compressed collage; regenerate a section as a fresh image rather than cropping an existing one if it isn't clear enough.
3. **No reference exists and no image-generation tool is available.** Skip the generation step entirely - go straight to implementation, but apply every rule below (the combinatorial variation choices, the anti-slop bans, hero minimalism, anti-nested-box, extraction-discipline mindset) directly while writing code, as if you were extracting from a reference that matches the user's brief.

In all three cases, the image (when one exists) is the primary visual source of truth; the code is the translation layer. Do not drift into a generic default template during implementation - the anti-drift rule below is the most commonly violated part of this skill.

## Choose a coherent visual direction (commit, don't mash)

Before implementing, pick one option from each axis below and commit to it consistently rather than combining everything into chaos:

- **Theme paradigm:** pristine light mode / deep dark mode / bold studio solid / quiet premium neutral
- **Background character:** subtle technical grid or dotted field / solid field with soft ambient gradient depth / full-bleed cinematic imagery / tactile textured surface
- **Typography character:** clean grotesk / refined grotesk / expressive display / compressed statement type / editorial serif+sans / Swiss rational hierarchy
- **Hero architecture:** cinematic centered minimalist / asymmetric split / floating polaroid scatter / inline typography behemoth / editorial offset composition / massive image-first hero with restrained text
- **Section system:** modular bento rhythm / alternating editorial blocks / poster-like stacked storytelling / gallery-led cadence / Swiss grid discipline / asymmetric premium marketing flow
- **Signature component set:** pick exactly 4 unique components (e.g. diagonal staggered masonry, 3D cascading card deck, hover-accordion slice layout, gapless bento grid, infinite brand marquee, turning polaroid arc, vertical rhythm lines, off-grid editorial layout, split testimonial quote wall, layered image crop frames)
- **Motion-implied language:** pick exactly 2 (scrubbing text reveal, pinned narrative section, staggered float-up, parallax image drift, smooth accordion expansion, cinematic fade-through)

## Deep analysis (before writing any code, when a reference image exists)

Treat the reference like a design specification, not a vibe. Extract explicitly:

- **Text:** hero headline, subheadline, CTA wording, section titles - use exact visible text where readable; if text is too small to read reliably and image generation is available, regenerate a closer detail image rather than guessing.
- **Typography:** size relationships, weight relationships, line count, line-height feel, tracking feel, serif-vs-sans behavior, display-vs-body contrast, whether the type reads calm or aggressive.
- **Spacing:** headline-to-subheadline distance, text-to-button distance, card gaps, section top/bottom spacing, side gutters, card padding, image-to-text distance, overall cadence. The goal is faithful spacing logic, not pixel-perfect OCR - and never collapse generous spacing into generic tight defaults.
- **Buttons/components:** size, shape, radius, fill vs outline, icon usage, hover-implied styling, primary vs secondary hierarchy, card structure, dividers, shadows, borders, pill logic, input styling.
- **Color:** background, panel colors, accent colors, button fills, text color hierarchy, border color logic, shadow mood, image tint/grade, gradient restraint. Preserve the reference's color logic - never replace a deliberate palette with generic default web colors.
- **Layout/structure:** grid logic, section ordering, section density, visual rhythm, repeated motifs that define the design language.

## Anti-drift implementation rule

The most common failure mode: the plan or reference looks strong, but the coded result becomes generic. During implementation, do not simplify into default templates, replace distinctive sections with generic rows, compress generous spacing into dense layout, replace strong typography with plain hierarchy, or reintroduce nested-box complexity that was intentionally avoided. The final result should still feel like the same design that was planned or referenced - faithful translation, not "inspired by."

## Hero minimalism (non-negotiable)

- The hero must read like a strong opening scene: very clean composition, one strong focal point, no competing focal points.
- Headline: 1 line ideal, 2 lines very good, 3 lines maximum. Never 4+ lines or paragraph-like hero copy. If the headline is getting long, cut words - don't force more lines.
- Keep supporting text concise; prioritize negative space and contrast.
- Do not stuff the hero with pills, fake stats, badges, tiny logos, or decorative micro-labels ("00 orchestration layer" style pseudo-system text) that don't add real value.
- The first screen must stay readable and uncrowded on a small laptop viewport - don't try to expose the entire product above the fold.

## Anti-nested-box rule

Do not default to box-in-box-in-box layouts: giant rounded section containers wrapping everything, cards inside larger cards inside outer cards, dashboard-like compartment stacking with no reason. Use a box only when it has a clear purpose. Prefer open layouts, generous whitespace, fewer but stronger containers, and one primary framing move per section rather than many layered frames.

## Anti-AI-slop bans (unless explicitly requested)

- **Layout slop:** one giant unreadable collage; endless centered sections; identical card rows repeated section after section; cloned left-text/right-image blocks in a row; cards-inside-cards; giant rounded wrapper sections around everything; overcompartmentalized dashboard framing.
- **Visual slop:** default purple/blue AI gradients; too many glowing edges; floating blobs everywhere; glassmorphism stacked without reason; over-rendered noise that hides the layout.
- **Typography slop:** giant heading + weak tiny subcopy; too many font moods in one page; lazy all-caps everywhere; generic gradient headline tricks.
- **Content slop:** filler verbs like "unleash," "elevate," "revolutionize," "next-gen," "seamless," "transformative platform"; fake brand names like "Acme," "Nexus," "Flowbit," "Quantumly," "NovaCore"; fake-complexity jargon (pseudo-enterprise control labels, decorative system markers, filler status microcopy, fake operator/runtime/orchestration language unless truly central to the brand).
- **Density slop:** over-packed sections, card overload, tiny spacing between major sections, visually exhausting walls of content.

## Section rhythm and spacing discipline

A high-end site does not feel like the same block repeated forever. Vary rhythm across sections by changing density, image-to-text ratio, alignment, scale, whitespace, card grouping, and background intensity - while keeping the page coherent and each section clean. Let the page breathe: even section spacing, generous negative space, no section feeling cramped next to one that feels empty. A premium site feels open, composed, balanced, confident - never cramped, noisy, uneven, or overfilled.

## Default section packs (when the user doesn't specify sections)

- **4-section:** Hero, Features, Social proof/testimonial, CTA
- **8-section:** Hero, Trust bar, Features, Product showcase, Benefits/use cases, Testimonials, Pricing, CTA
- **12-section:** Hero, Trust bar, Feature grid, Product preview, Problem/solution, Benefits, Workflow, Metrics/proof/integration, Testimonials, Pricing, FAQ, CTA+footer

## Before calling it done, verify

Hierarchy is obvious; hero is clean and readable on a small laptop; typography, spacing, buttons, and colors were actually analyzed (not guessed) when a reference existed; the result is visually distinctive and free of the AI-slop patterns above; unnecessary nested boxing has been removed; pills/labels/fake technical micro-elements have been minimized; if multiple sections exist, they clearly belong to the same coherent design world (same accent color, type scale, button style, radius logic, component family) rather than drifting section to section.
</content>
