---
name: impeccable-design
description: A condensed adaptation of the "impeccable" design philosophy: an award-winning-design-director mindset for reviewing and refining frontend UI. Distinguishes refinement from redesign, names the visitor mode (Persuade/Operate/Read/Experience) to set the right bar, applies a craft floor of verified checks and banned AI-slop defaults, and gives focused playbooks for polishing, going bolder, going quieter, adding color, tuning typography, fixing layout, adding motion, or adding delight. Use when asked to critique, polish, redesign, or elevate the quality of a UI, page, or artifact.
---

> Source: condensed and adapted from the open-source "impeccable" skill (github.com/pbakaus/impeccable) by Paul Bakaus. The original is a multi-file, script-driven skill (a compiled CLI launcher plus ~30 reference files and project state files); this is a self-contained distillation of its core philosophy and playbooks for use as a single skill, with the CLI/script machinery, PRODUCT.md/DESIGN.md workflow, and native-platform-specific sections removed.

# Impeccable Design

This skill gives permission and a method to make design work that is out-of-distribution craft, not safe, timid, or templated. Approach every design task as an award-winning design director would: production-grade output, a clear point of view, deep understanding of user and business needs, and exceptional craft. Go all out - no hedging, no shortcuts, no placeholder comments. Dream big and bold: distinct, beautiful, outstanding, inspiring work.

Verify in one bounded pass, not an open-ended loop: build fully, inspect once (desktop and mobile together), fix everything the inspection shows in one batch, confirm with at most one more round, then stop. Endless self-QA burns effort doing worse what a clean finish pass does better.

## Refinement vs. redesign

These are different jobs - decide which one was actually asked for before touching anything:

- **Refinement preserves.** It keeps the incumbent identity, behavior, copy, and everything outside scope. Ask before replacing factual copy or adding claims.
- **Redesign replaces.** It keeps product truth, content, and function, but treats the old look as evidence and anti-reference, and commits to a new visual world instead of splitting the difference between old and new.
- **The brief wins.** Honor pinned aesthetics, eras, materials, fonts, and palettes the user names, even when they conflict with the guidance below. Redirecting a clear brief toward your own taste is a failure, not craft.

## Visitor modes

Name the mode before deciding how loud, quiet, structured, or expressive the design should be. Choose it from the surface being built, not the product category as a whole - a tool's own landing page is still Persuade even if the tool itself is Operate.

- **Persuade:** the visitor decides and acts. Landing pages, marketing, campaigns, pricing. Design is the product; earn attention and action.
- **Operate:** the visitor completes a task. App UI, dashboards, editors, admin, settings, tools. Scanability, consistency, and native expectations outrank expression. Brand lives in precise details, not loud gestures.
- **Read:** the visitor understands something. Docs, articles, guides, help, changelogs. Structure for comprehension first, then make staying worthwhile.
- **Experience:** the visitor is inside the work itself. Portfolios, galleries, showcases. Let the artifact lead; the interface recedes.

## The craft floor

Apply this after the direction is settled and the brief's own choices are locked in. A pinned brief overrides anything here; your own habit does not.

### Verify (checks on the built result, not intentions)

- **Contrast:** body and placeholder text ≥4.5:1, large text ≥3:1. On colored surfaces tint secondary text from that hue or the foreground; never plain gray.
- **Depth:** shadows carry an offset and a soft blur. A zero-offset colored halo is decoration, not depth.
- **Spacing:** tight groups, generous separation between groups, more space above a heading than below it.
- **Type:** body measure 65-75ch, display type capped around 6rem, tracking floor around -0.04em, an obvious scale and weight step between roles. Run the real copy at every breakpoint and fix what overflows.
- **Motion:** one authored moment, not scattered effects and not the same entrance repeated on every section. Ease-out from an already-visible starting state. Consider blur, backdrop-filter, clip-path, mask, and shadow as part of the palette, not just transform/opacity, as long as they stay smooth.
- **States:** hover, disabled, loading, error, empty - all present. Real content, working controls, responsive composition, visible keyboard focus.
- **Browser surfaces:** the parts you didn't explicitly draw still carry the design. Text selection color, the caret, custom scrollbars, focus rings, underline offset, and tabular numerals in data all ship with browser defaults that belong to no design system. Theme them from the palette - this is one of the cheapest signals that a page was actually designed rather than assembled, and the one most commonly skipped.
- **Copy:** the product's own language. Controls name their action; errors name the problem and the recovery.
- **Coverage:** every requirement from the brief is present and findable within seconds.

### Refuse (category defaults, not absolute bans - the brief's own words can earn most of them back)

Page scaffolds:
- Same-size cards of icon + heading + text as the default page structure. Nested cards are always wrong.
- The hero-metric template: big number, small label, supporting stats, accent color.
- A kicker/eyebrow label above a heading. This one IS an absolute ban - no brief earns it back. Delete the label and let the heading speak.
- Section numbers (01/02/03) unless the sequence itself carries information the reader needs.
- A modal for a task that needs neither interruption nor protected focus.

Surface habits:
- Gradient text as emphasis (use weight or size instead).
- Glass/blur used as generic decoration rather than a specific, deliberate effect.
- A colored border-left/border-right thicker than 1px on cards, list items, callouts, or alerts.
- Hard offset shadows (`box-shadow: 4px 4px 0`) outside a genuinely neobrutalist world.
- Sparklines, progress rings, and soft-shadowed rounded rectangles standing in for real content.
- Monospace used as a costume for "technical" rather than for actual code, data, or measurement.
- A generic system display face (Impact, Arial Black, the platform default sans) as the display voice of a page with its own identity.
- Unicode glyphs or emoji standing in for a real icon system - use a consistent stroke-weight icon library or authored SVG.
- A circle/polygon/gradient cutout standing in for a real photographic cutout - derive an alpha matte from the actual image or skip the effect.
- Light or dark mode picked by category convention rather than by the actual use scene (who, where, what ambient light).

The floor holds the mechanics; it never picks the creative direction. With every check green, spend the remaining effort on the committed visual world - and when torn between "refined" and "committed to the bold choice," commit.

## Focused playbooks

Use the one that matches what was actually asked. Each ends with a final polish pass (the Verify/Refuse floor above).

### Polish - final quality pass before shipping

Polish is refinement, never a concealed redesign. If the underlying concept is wrong, say so and recommend a redesign instead of quietly replacing it.

1. Read the existing tokens, shared components, and neighboring patterns (or infer coherent conventions if none exist). Classify each inconsistency as: a missing token, a one-off that should use an existing pattern, a conceptual mismatch with neighboring areas, or a simple local defect - then fix at the narrowest correct level.
2. Use the feature yourself at representative sizes (desktop and mobile). Note whether the path is functionally complete and what states/content lengths/roles it will actually encounter.
3. Triage and fix in this order: (1) broken/blocked tasks, data loss, misleading state, inaccessible paths; (2) missing loading/empty/error/success/disabled/permission states; (3) flow, hierarchy, responsive, and design-system drift; (4) visual and motion inconsistencies; (5) code/asset cleanup. Don't perfect one corner while the rest stays below bar.
4. Walk the whole path again with mouse, keyboard, and touch. Check every supported viewport, not just the one you were looking at. Check zoom, contrast, focus order, console errors, and layout shift.
5. Finish with a source diff pass: remove accidental churn, dead code, and temporary artifacts. Ship only when the feature is functionally complete and consistently finished end to end.

### Bolder - amplify a flat section

Scoped to something that already exists; "everything else stays" is literal. A section usually reads flat because it quietly opts out of a move the rest of the page already makes (full-strength display type, a structural device, a signature motif, density/pacing). Bring the target up to the expressive level its neighbors already reach, in the system's own vocabulary - don't invent a new one. Reusing existing motifs at full strength beats adding new colors, fonts, or effects the page doesn't already own. Make one decisive move completely, then quiet everything around it so the move reads clearly; if everything got louder, the section got flatter, not bolder. Strip the copy and check the bare structure still communicates through hierarchy alone (the skeleton test) - if it only works with the words in place, the boldness lived in the text size, not the design.

### Quieter - reduce intensity without going generic

Quiet is harder than bold; subtlety needs precision. Identify what's creating the intensity: saturation, contrast extremes, competing bold elements, animation excess, sheer complexity, or scale with no hierarchy. Reduce saturation to roughly 70-85%, let neutrals do more work with color as a rare accent, use warm/cool tinted grays instead of pure gray (never plain gray text on a colored background - use a darker shade of that color instead), reduce font weights and sizes where appropriate, increase whitespace, remove decorative gradients/shadows/patterns that don't serve a purpose, shorten animation distances and remove flourishes that aren't functional. Never make everything the same size/weight, never strip all color, never eliminate personality entirely - "quieter" means refined and easier on the eyes, not boring or generic. Think restraint as a luxury signal, not laziness.

### Colorize - introduce color as hierarchy and meaning

Preserve any confirmed brand/semantic colors. Before choosing anything, identify current surface/text/action/semantic roles, where grayscale is obscuring hierarchy, and any contrast failures. Build roles, not a bag of swatches: canvas/elevated surfaces, primary/secondary text, action/focus/selection, borders, and semantic states (success/warning/error/info). Let the strongest color own a deliberate region or role rather than scattering tiny accents everywhere, and don't spend the primary action's color on decoration. On colored surfaces, derive secondary text from the surface hue rather than washed-out gray. Verify computed contrast: body text 4.5:1, large text and controls/icons/focus indicators 3:1. Design light and dark themes as separate compositions with real elevation logic, not a mechanical inversion. For data visualization, vary lightness/chroma/shape/label, not color alone.

### Typeset - improve hierarchy and readability

Preserve confirmed type families; improve their use rather than replacing the identity (unless the user explicitly asked for a new one). Confirm which faces/weights/roles are established and whether every family is actually necessary. Check that heading/body/label/metadata roles are distinguishable at a glance, that the scale is deliberate rather than arbitrary, and that repeated roles stay identical across screens. Keep body copy in a comfortable 45-75ch measure, tune line-height inversely with measure (wider lines need more leading), and compensate light text on dark surfaces with slightly more line-height, a touch more tracking, and sometimes one step more weight. Use the fewest roles/families that make the hierarchy unmistakable - combine size, weight, space, and color deliberately rather than asking size to do all the work alone. Test long headings, localization expansion, zoom, and narrow containers before calling it done.

### Layout - fix structure, not just spacing

Diagnose the structural problem before moving boxes. Apply the squint test: with detail blurred, can you still identify the primary element, the secondary element, and the major groups in order? Group by proximity before reaching for containers or decorative borders. Create rhythm through deliberate contrast between tight and generous spacing intervals rather than one repeated value everywhere. Use a documented spacing scale (a 4-unit base usually covers useful middle steps an 8-only scale misses). Let hierarchy follow actual product priority, not framework defaults (three equal cards, a grid because a grid was available). Make responsive behavior structural - reorder, collapse, or reveal based on what stays important, not just "it wraps." Verify the reading/task order still holds at narrow, intermediate, and wide viewports, and that keyboard/touch/assistive-tech order agrees with the visual order.

### Animate - motion with a purpose

Find the job before adding any motion: acknowledging an action, making a state change legible, preserving continuity through navigation, directing attention at a meaningful moment, or embodying the visual world. A generic fade-and-rise, hover lift, parallax layer, or scroll reveal used with no specific reason is not a thesis - name what this specific product moment needs. Timing should express distance and consequence: 100-150ms for immediate feedback, 150-300ms for a routine state change, 300-500ms for a layout/overlay/view transition, 500-800ms only for a genuinely authored focal entrance. Exit faster than entrance. Use natural deceleration curves (`cubic-bezier(0.16, 1, 0.3, 1)`) rather than bounce or elastic by reflex. Prefer transform/opacity for reliability but don't limit the palette to only those - bounded blur, clip-path, and shadow changes can carry real meaning too. Every animation needs a `prefers-reduced-motion` path that reduces movement while preserving opacity/color transitions that carry meaning - reduced motion means gentler, not zero.

### Delight - earn a memorable moment

Delight is product character revealed through a useful interaction or a considered detail, not a layer of generic whimsy sprinkled everywhere. Concentrate it at moments that matter: first use, completion, recovery, mastery, or a genuinely meaningful action - not an ordinary click. State in one sentence what the user should feel and why that feeling belongs to this specific product, then pick the smallest system that delivers it (a distinctive response, product-specific language, a recognizable material behavior, a discovery reward that reveals real utility). Match response intensity to effort and consequence: routine saves should just feel certain, major milestones can expand. In error states, lead with the problem and the recovery path - warmth can reduce stress, but jokes must never trivialize loss, money, privacy, or blocked work. Delight must never delay, block, or obscure the primary task, override accessibility or platform conventions, or become mandatory and exhausting on repeat.

## Verify before calling it done

Run through the craft floor's Verify list and Refuse list above as the final gate. If a single item can't be honestly confirmed, the work isn't finished yet.
</content>
