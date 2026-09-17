# Simplify the checkout

## Changes
- Keep `/` as the minimal checkout rather than adding a landing page now.
- Remove the visible product description and feature list.
- Remove the visible “Health Band” name and Ovoa logo, leaving the `$99` price as the product cue.
- Remove the `Aa` and moon controls.
- Lock the experience to the light theme and use Arial for clear, familiar typography.
- Preserve the existing product gallery, checkout fields, neumorphic styling, and visual-only submission feedback.

## Technical details
- Keep a screen-reader-only checkout heading so the page remains accessible and search-friendly without adding visible copy.
- Retain product metadata and structured product details in the page head; only the visible checkout is simplified.
- Remove the text-style control from the Band app header as Arial becomes the fixed type style everywhere.
