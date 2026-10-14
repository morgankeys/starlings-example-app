# Rounded clipping and edge fringes

How to build a rounded surface that stacks layers (a photo under a scrim, a gradient, a
state layer, a border) without a thin light or dark line showing at its edge. Load this
before styling any card, thumbnail, or overlay where one layer is meant to hide another.

This is about how browsers rasterize and composite, not about any framework. It applies to
plain CSS, CSS modules, scoped component styles, Tailwind, or anything else that ends up
as `border-radius`, `overflow`, and stacked boxes.

## The symptom

A hairline of the lower layer shows where it should be fully covered. Typical cases:

- light photo pixels along the rounded corner of a dark hover scrim
- a pale seam down the side of a card where a dark gradient sits over a photo
- a light line between a thumbnail and its scrim, coming from a border

It is often only visible at some zoom levels, device pixel ratios (DPR), or scroll
positions, and more often on real GPU-composited devices than in screenshots.

## Why it happens

1. **Every clipped edge is anti-aliased on its own.** Along a curve, or a straight edge at
   a fractional position, the edge pixels are partly covered. The browser blends each
   layer's edge separately.
2. **Two layers clipped separately along the same edge don't fully cover each other.**
   If the top layer covers 50% of an edge pixel and so does the bottom layer, the result
   is not "top layer at 50%". About a quarter of the bottom layer still shows through
   (the conflation artifact). When the top layer is a dark scrim and the bottom layer is a
   light photo, that leftover reads as a light fringe.
3. **Nested clips multiply the problem.** A child with its own `border-radius` or
   `overflow` inside a rounded parent gets clipped twice. Each clip can rasterize slightly
   differently, so the child's edge and the parent's edge don't line up.
4. **Borders paint outside the content box.** A `border` on the lower layer sits outside
   anything layered on top inside it, so a scrim can never cover it.

## Rules

1. **Clip once, at the outermost rounded surface.** Put the radius and the clipping
   (`overflow: clip` or `hidden`) on the outermost element only. Inner wrappers for media,
   scrims, and bands get no radius and no clipping of their own.
2. **Draw the covered layer and its cover as one layer.** Give the wrapper that holds both
   its own stacking context and compositing layer (in CSS:
   `isolation: isolate; transform: translateZ(0)`). The browser then flattens the photo
   and the scrim into one image before the outer clip cuts it, so there is only one edge.
3. **Overhang the cover past the covered layer's outer edges.** Extend the scrim or
   gradient past the image on every side that touches the outer clip, by the smallest
   spacing token you have (about 2px). The outer clip trims it. No sub-pixel sliver of the
   lower layer can survive outside the cover.
   - Keep the cover fully opaque for the overhang. With a gradient, start the solid stop
     at the overhang distance, not at `0%`.
   - If the cover holds text, add the overhang back into its padding so the text doesn't
     move.
4. **Put borders and dividers inside.** Use an inset `box-shadow` (or an inner pseudo-element)
   instead of `border` on any layer that something is stacked over, so the cover paints
   over it.
5. **Use design tokens for the overhang.** Derive it from the spacing scale, for example
   `calc(-1 * <smallest spacing token>)`, rather than a raw `-2px`.

## Recipe

Token names below (`--radius-large`, `--space-xxs`, `--color-scrim`, …) are placeholders;
use the project's own namespace (`--<prefix>-*`, see `Agents/context/design-system.md`).

Structure (any markup language that produces this DOM):

```html
<a class="card">            <!-- radius + clip live here, and only here -->
  <div class="media">       <!-- one layer: no radius, no clip -->
    <img />
    <div class="scrim"></div>  <!-- overhangs the image, clipped by .card -->
  </div>
</a>
```

```css
.card {
  overflow: clip;
  border-radius: var(--radius-large);
}

.media {
  position: relative;
  /* One composited layer, clipped only by the card. A radius or clip here clips
     the image and the scrim separately and leaves a fringe on the edge. */
  isolation: isolate;
  transform: translateZ(0);
  /* Inset so the scrim covers it. A border sits outside the scrim. */
  box-shadow: inset 1px 0 0 var(--color-outline);
}

.media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* A bottom gradient that holds a headline, with the card's edges on the left, right
   and bottom. */
.scrim {
  position: absolute;
  /* Past the image on the edges the card clips; the card trims it. */
  inset: auto calc(-1 * var(--space-xxs)) calc(-1 * var(--space-xxs));
  background: linear-gradient(
    to top,
    var(--color-scrim) var(--space-xxs),
    transparent 100%
  );
  /* Add the overhang back so the headline stays put. */
  padding: var(--space-md) calc(var(--space-xl) + var(--space-xxs))
    calc(var(--space-lg) + var(--space-xxs));
}
```

Only overhang the sides that meet the outer clip. A side that fades into the photo, or
meets other content inside the card, needs no overhang. A full-cover hover scrim that
touches the card on three sides gets the overhang on those three.

## Trade-offs to know about

- **`translateZ(0)` costs a GPU layer** per element. Fine for a handful of cards, not for
  hundreds of list rows. Use it where layers are stacked over media, not on every box.
- **A transformed element paints above later non-positioned siblings.** An overhang that
  extends past the wrapper (for example 2px down into the text area below) paints over
  that area. That is harmless when the cover and the area below are the same color; check
  it when they aren't.
- **Removing an inner clip means the inner content must fit.** Make media fill its wrapper
  exactly (`width/height: 100%`, `object-fit: cover`) so nothing relied on that clip.

## How to verify

Screenshots at 1x usually look fine, so check where the defect actually appears.

1. **Render at several DPRs:** 1, 1.25, 1.5, 2 and 3. Fractional DPRs (1.25, 1.5) expose
   the most.
2. **Nudge the element to fractional positions:** offset it by 0.25, 0.33, 0.5 and 0.66px.
   Elements inside scrolling carousels sit at fractional positions all the time.
3. **Check both color modes.** A light fringe shows against a dark page and a dark fringe
   against a light one.
4. **Measure, don't eyeball.** Capture the strip along the edge and compare each pixel to
   the expected colors. For example, against a dark page with a black cover, any pixel
   brighter than the page background is the lower layer leaking.
5. **Confirm nothing moved.** Compare the bounding boxes of text inside the cover before
   and after the change.
6. **Know the limits.** Headless browsers usually rasterize in software. A clean headless
   result is good evidence, not proof; check a real device when you can.

## Review checklist

When a surface has a radius and something stacked over media:

- [ ] Exactly one element in the stack has `border-radius` and clipping.
- [ ] The media and its cover share one wrapper with its own compositing layer.
- [ ] The cover overhangs every edge that meets the outer clip, and is opaque there.
- [ ] Text in the cover didn't move (padding compensates for the overhang).
- [ ] No `border` on a layer that something is meant to cover.
- [ ] Checked at fractional DPRs and fractional positions, in light and dark mode.

## Where this came from

Two fixes in the project this kit was distilled from, both resolved with the rules above:

- **Thumbnail with a hover scrim:** the thumbnail had its own radius inside a rounded card,
  so the image and the scrim were clipped separately and light pixels showed along the
  curve. A `border` on the thumbnail also painted outside the scrim as a light seam.
- **Card with a photo band and a headline gradient:** the photo band was clipped separately
  from the card, so a sliver of photo showed beside the gradient where it meets the card
  edge. It only appeared at a fractional DPR (1.5x).

When you fix a new case in a project, add it here with the commit or PR that fixed it.
