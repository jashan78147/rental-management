---
name: design-md
description: Read and faithfully apply a DESIGN.md file (a plain-markdown design-system spec) when one exists in a project, is pasted in, or the user names a specific brand's system to imitate; also generate a DESIGN.md by documenting an existing UI's design system. Use whenever a project has a DESIGN.md, the user says "match this brand's design system," or asks to document/extract a design system as markdown.
---

> Source: adapted from the DESIGN.md concept introduced by Google Stitch (stitch.withgoogle.com/docs/design-md) and the schema used by the VoltAgent/awesome-design-md collection (github.com/VoltAgent/awesome-design-md, ~73 ready-made DESIGN.md files extracted from real brands - Stripe, Airbnb, Apple, Linear-style tools, Tesla, and more, each under a permissive request-for-use model). This skill teaches the general method: how to read and apply any DESIGN.md, not one specific brand's file.

# DESIGN.md: reading and applying a design system spec

`DESIGN.md` is a plain-markdown file that documents a design system - colors, typography, components, spacing, and rules - so that an AI agent (or a person) can generate UI that's consistent with it, without needing Figma exports, JSON tokens, or special tooling. Markdown is the format models read most reliably, so a DESIGN.md is meant to be dropped straight into a project and followed like a brief.

## When to use this skill

- A `DESIGN.md` file already exists in the project root or was pasted into the conversation - read it before generating or editing any UI.
- The user names a specific brand or product and asks to match its look ("make this feel like Stripe," "give me the Linear aesthetic") - if a DESIGN.md for that brand isn't already available, say you don't have that specific file and ask the user to paste one (for example from the VoltAgent/awesome-design-md collection, which has ~73 ready-made ones at getdesign.md) rather than inventing brand specifics from memory, since exact tokens (hex codes, font names, spacing scale) need to come from a real source, not a guess.
- The user asks to document, extract, or capture an existing UI's design system as markdown - generate a new DESIGN.md following the schema below.

## The DESIGN.md schema

A well-formed DESIGN.md covers these sections, in roughly this order:

1. **Visual Theme & Atmosphere** - the overall mood, density, and design philosophy in a sentence or two (e.g. "warm-canvas editorial interface... cream/coral pairing, deliberately warm and humanist where most AI brands use cool blue + slate").
2. **Color Palette & Roles** - not just swatches: each color gets a semantic name, a hex value, and its functional role (primary, primary-active, primary-disabled, ink/body text, muted text, hairline/border, canvas/surface variants, dark-mode surfaces, semantic success/warning/error, accent colors). Roles matter more than the raw hex - "primary-active" tells you when to use it, a bare swatch doesn't.
3. **Typography Rules** - font families (with real fallback stacks), and a full hierarchy table (display-xl, display-lg, headings, body, caption, etc.) with fontSize, fontWeight, lineHeight, and letterSpacing for each level.
4. **Component Stylings** - buttons, cards, inputs, navigation, each with their states (default, hover, active, disabled, focus) and how the system's tokens apply to them.
5. **Layout Principles** - the spacing scale (base unit and steps), grid/container widths, and the whitespace philosophy (tight vs. generous, and where each applies).
6. **Depth & Elevation** - the shadow system and surface hierarchy (how many elevation levels exist, what distinguishes a card from a modal from a popover).
7. **Do's and Don'ts** - explicit guardrails and anti-patterns for this specific brand (e.g. "never mix warm and cool grays," "no gradient text," "this brand never uses drop shadows on buttons").
8. **Responsive Behavior** - breakpoints, minimum touch target sizes, and the collapsing/reflow strategy for narrow viewports.
9. **Agent Prompt Guide** - a quick-reference block (key colors, key fonts, ready-to-use prompt snippets) meant to be copy-pasted into a prompt for fast recall.

## Applying a DESIGN.md

When one is present, treat it as the binding brief - it overrides this session's own default design taste (any other design/taste skill's defaults yield to an explicit DESIGN.md):

- Use the exact semantic color roles, not approximations - if the file says `primary: "#cc785c"` with role "primary-active: #a9583e", use those exact values for those exact states, don't round to "a coral color."
- Follow the typography hierarchy table literally - font family, size, weight, line-height, and letter-spacing per role, not just "use a serif for headings."
- Respect the Do's and Don'ts section as hard constraints, even when they conflict with generic best practice (a brand's own anti-patterns are more authoritative than a generic guideline for that brand's own UI).
- Carry the spacing scale and elevation system through every component you build, not just the first one - consistency across the whole surface is the point of having the file at all.
- If the DESIGN.md is incomplete for something you need (e.g. no explicit disabled-state color), infer conservatively from the nearest defined role and the stated visual theme rather than reaching for an unrelated default.

## Generating a DESIGN.md from an existing UI

When asked to document or extract a design system:

1. Inspect the actual rendered UI and/or source (CSS, tokens, component styles) rather than guessing from the brand's reputation.
2. Fill every section of the schema above with real, observed values - computed hex codes, actual font-family declarations, measured spacing, not invented ones.
3. Write the Do's and Don'ts section from what the UI actually does consistently (and conspicuously avoids), not a generic checklist.
4. End with the Agent Prompt Guide block so the file is immediately usable by a future prompt.
5. Save it as `DESIGN.md` at the project root, matching the convention this skill reads from.

## Relationship to other design skills

A DESIGN.md is brand-specific ground truth; other design-taste skills (general anti-slop rules, accessibility guidelines, animation philosophy) are brand-agnostic defaults. When a DESIGN.md is present, its specific tokens and rules win over a generic default from another skill; the generic skills still apply for anything the DESIGN.md doesn't specify (e.g. accessibility contrast minimums, animation performance rules).
</content>
