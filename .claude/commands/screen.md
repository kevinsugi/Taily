---
description: Implement one Figma screen and diff it
---

Implement screen $ARGUMENTS (a screen id from `scripts/screens.json`).

Steps:

1. `get_metadata` on the node, then `get_design_context` on each top-level child (not the whole frame) and `get_screenshot` on the frame.
2. Write `js/screens/<id>.js` exporting `render(state)` that returns the screen's HTML using ONLY components from `js/components.js`; if a needed variant is missing, add it to `components.css` / `components.js` / `components.html` first.
3. Register the screen in `js/app.js`.
4. `npm run diff -- <id>`.
5. Iterate until ≤1% mismatch; then list every remaining pixel deviation and its cause.

Do not touch other screens. Do not modify `tokens.css`.
