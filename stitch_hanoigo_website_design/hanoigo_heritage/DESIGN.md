# Design System Document: The Heritage Modernist

## 1. Overview & Creative North Star
**Creative North Star: "The Curated Sanctuary"**

This design system moves away from the sterile, "tech-heavy" aesthetic of traditional password recovery pages. Instead, it draws inspiration from high-end hospitality and editorial design. We are building a "Curated Sanctuary"—a space that feels secure, intentional, and calm. 

To break the "template" look, we avoid the rigid constraints of traditional grids. We embrace **intentional whitespace** and **tonal layering**. The Reset Password page should not feel like a hurdle; it should feel like a guided, premium transition back into the user's journey. By using overlapping surfaces and high-contrast typography scales, we create a sense of architectural depth and bespoke craftsmanship.

---

## 2. Colors & Surface Logic

Our palette balances the energy of #FF5A5F (Vibrant Orange) with the grounding stability of #F7E7CE (Heritage Yellow).

### Surface Hierarchy & Nesting
We reject the flat UI. Hierarchy is defined through a "stacked paper" metaphor. 
- **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries are created through background shifts.
- **Base Layer:** Use `surface` (#fdf9f3) for the global background.
- **The Core Card:** Use `surface_container_lowest` (#ffffff) for the centered Reset Password card. This creates a "bright" focus point.
- **Nested Elements:** Inside the card, use `surface_container` (#f1ede7) for input field backgrounds to create a recessed, tactile feel.

### Signature Textures & Glass
- **The "Vibrant Pulse" Gradient:** For primary actions, do not use a flat hex. Apply a subtle linear gradient from `primary_container` (#ff5a5f) to `primary` (#b52330) at a 135-degree angle. This adds "soul" and dimension.
- **Glassmorphism:** For any floating tooltips or "Need Help?" overlays, use `surface_bright` at 80% opacity with a `20px` backdrop-blur to maintain the "Sanctuary" feel.

---

## 3. Typography: Editorial Authority

We use **Inter** not as a system font, but as a Swiss-style editorial tool.

*   **Display & Headline (The Welcome):** Use `headline-lg` (2rem) for the "Reset Password" title. Tighten the letter-spacing to `-0.02em` to give it a premium, "ink-on-paper" density.
*   **Body (The Guide):** Use `body-lg` for instructions. The high contrast between the `on_surface` (#1c1c18) text and the soft yellow background ensures maximum legibility.
*   **Labels (The Detail):** Use `label-md` in `on_surface_variant` (#5a403f). These should be all-caps with a `0.05em` letter-spacing to act as sophisticated signposts above input fields.

---

## 4. Elevation & Depth: Tonal Layering

Depth in this system is a result of light and shadow, not lines.

*   **The Layering Principle:** Instead of shadows, stack `surface_container_low` on top of `surface`. The human eye perceives the color shift as a change in elevation.
*   **Ambient Shadows:** For the main reset card, use a custom shadow: `0px 20px 40px rgba(104, 93, 74, 0.08)`. Note the color: we use a tinted version of `secondary` (#685d4a) rather than grey to mimic natural, warm light.
*   **The "Ghost Border" Fallback:** If a field requires more definition (e.g., in an error state), use `outline_variant` (#e2bebc) at **20% opacity**. It should be felt, not seen.

---

## 5. Components

### Input Fields (The Foundation)
*   **Visual Style:** No borders. Use a `surface_container` (#f1ede7) fill with a `md` (0.75rem) corner radius. 
*   **Active State:** Transition the background to `surface_container_highest` and add a soft 2px glow using `primary_fixed_dim` at 30% opacity.
*   **Error State:** Change background to `error_container` (#ffdad6). Text remains `on_error_container`.

### Buttons (The Statement)
*   **Primary:** Rounded `xl` (1.5rem) or `full`. Use the "Vibrant Pulse" gradient. Text is `on_primary` (#ffffff), bold.
*   **Secondary/Action:** For "Success" or "Verification" steps, use `tertiary_container` (#2ba947) with `on_tertiary_container` (#00350d) text. This provides a clear, trusting "Go" signal.

### The Success Micro-Card
*   Instead of a simple toast message, once the password is reset, transform the central card using a **Heritage Yellow** (`secondary_container`) wash. This celebratory shift in color signals completion without a word of text.

### Progress Stepper
*   Use `surface_container_highest` for inactive steps and `primary` for active. Use a `0.25rem` height bar with `full` rounding—no outlines.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical padding. Give the top of the card more breathing room (e.g., `xl` spacing) than the sides to create an editorial feel.
*   **Do** use "Heritage Yellow" (`surface_container_low`) for large empty areas to keep the interface feeling warm and "human."
*   **Do** ensure all interactive elements have a minimum touch target of 48px, hidden within the seamless visual containers.

### Don't:
*   **Don't** use 1px black or grey borders. If you feel the need for a line, use a background color change instead.
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#1c1c18) to maintain the soft, premium tone.
*   **Don't** use standard "drop shadows" from software defaults. Always tint your shadows with the secondary heritage palette.