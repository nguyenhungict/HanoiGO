# Design System Document: The Heritage Modernist

## 1. Overview & Creative North Star
**The Creative North Star: "The Curated Collector"**
This design system moves away from the rigid, boxed-in layouts of traditional travel apps. Instead, it adopts the philosophy of a high-end editorial look—blending the vibrant energy of modern Hanoi with the soft, weathered elegance of its heritage. 

We break the "template" look through **Intentional Asymmetry** and **Tonal Depth**. By removing 1px borders entirely, we treat the screen as a canvas of light and shadow. Elements should feel layered and organic, using overlapping typography and "floating" surfaces to create a sense of movement and prestige. This is not just a utility; it is a digital concierge.

---

## 2. Colors & Surface Philosophy
The palette balances the high-energy `primary` (#FF5A5F) with the grounding `secondary` heritage yellow (#F7E7CE).

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or containers. 
*   **Boundaries via Tone:** Define changes in content hierarchy using background shifts. A `surface-container-low` (#F3F3F3) card should sit on a `surface` (#F9F9F9) background to create a "ghost" edge.
*   **Boundaries via Space:** Use generous white space (24px, 32px, or 48px increments) to signal the end of a content block.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper. 
*   **Background (`surface`):** The base layer.
*   **Content Areas (`surface-container-low`):** Used for large content blocks or sidebars.
*   **Interactive Cards (`surface-container-lowest`):** Use the absolute white (#FFFFFF) to make interactive elements pop against the off-white background.
*   **Overlays (`surface-bright`):** For modals and floating menus to maximize "lift."

### Signature Textures (The Glass & Gradient Rule)
To prevent the UI from feeling "flat," main CTAs and Hero sections should utilize a subtle **Vibrancy Gradient**:
*   **Primary Gradient:** From `primary` (#B52330) to `primary-container` (#FF5A5F) at a 135-degree angle.
*   **Glassmorphism:** For floating navigation bars or quick-action menus, use `surface-container-lowest` at 80% opacity with a `20px` backdrop-blur. This allows the heritage yellow or vibrant orange to bleed through softly, grounding the element in its environment.

---

## 3. Typography
We utilize **Inter** not as a standard sans-serif, but as a modernist tool for hierarchy.

*   **Display (lg/md):** Use for "Hero" moments. Letter spacing should be set to `-0.02em` to create a tighter, premium "headline" feel.
*   **Headline (sm/md/lg):** Use these for section headers. Ensure high contrast against the body text.
*   **Title (sm/md/lg):** These function as the "Anchors." Use `title-lg` for card titles to ensure immediate legibility.
*   **Body (lg/md/sm):** Use `on-surface-variant` (#5A403F) for body text rather than pure black to maintain the "Luxe Indochine" softness.
*   **Labels:** Always uppercase with `+0.05em` letter spacing for a sophisticated, architectural look.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural lines.

*   **The Layering Principle:** Instead of shadows, place a `surface-container-lowest` (#FFFFFF) card inside a `surface-container-low` (#F3F3F3) section. The slight shift in hex code creates a "soft lift."
*   **Ambient Shadows:** For high-priority floating elements (e.g., "Book Now" buttons), use a shadow: `0px 12px 32px rgba(181, 35, 48, 0.08)`. Note that the shadow is tinted with the `primary` color, not grey.
*   **The Ghost Border Fallback:** If a container must be defined (e.g., in a high-density form), use `outline-variant` (#E2BEBC) at **15% opacity**. It should be felt, not seen.
*   **Corner Radii:** Follow the **Roundedness Scale**. Use `xl` (1.5rem) for main containers and `md` (0.75rem) for internal components like buttons or inputs.

---

## 5. Components

### Buttons
*   **Primary:** `primary-container` (#FF5A5F) background with `on-primary` text. Use the `xl` corner radius for a pill-shaped, modern look. 
*   **Secondary:** `secondary-container` (#EDDEC5) background. This feels like high-end stationery.
*   **Tertiary:** No background. Text in `primary`. Use for low-emphasis actions like "Cancel" or "View All."

### Input Fields
*   **Style:** Minimalist. No border. Use a `surface-container-high` (#E8E8E8) background. 
*   **Focus State:** Shift the background to `surface-container-highest` (#E2E2E2) and add a subtle `2px` bottom-only underline in `primary`.

### Cards & Lists
*   **Rule:** **Zero Dividers.** Separate list items using a `16px` vertical gap.
*   **Interaction:** On hover/press, the card should transition from `surface-container-low` to `surface-container-lowest` with a very soft ambient shadow.

### Selection Chips
*   **Selected:** `tertiary-container` (#2BA947) with `on-tertiary-container` (#00350D) text.
*   **Unselected:** `surface-container-high` (#E8E8E8).

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts. Let images bleed off the edge of the grid.
*   **Do** prioritize "Breathing Room." If you think there's enough white space, add 8px more.
*   **Do** use the `secondary` heritage yellow for large background sections to create warmth.
*   **Do** use `tertiary` (Green) exclusively for success states and confirmation actions.

### Don't
*   **Don't** use 1px black or grey borders. This is the quickest way to break the premium feel.
*   **Don't** use standard "Drop Shadows." Only use the diffused, tinted ambient shadows described in Section 4.
*   **Don't** crowd the "Display" type. Headline elements need space to "breathe" as if they were in a physical magazine.
*   **Don't** use pure #000000 black. Use `on-surface` (#1A1C1C) for all "black" text.