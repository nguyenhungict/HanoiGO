# Design System: The Heritage Curator

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Heritage Curator."** 

This is not a typical travel app; it is a digital concierge that marries the vibrant energy of modern Hanoi with the soulful elegance of Indochine history. We move beyond the "template" look by rejecting rigid boxes and heavy borders. Instead, we embrace a high-end editorial layout characterized by **asymmetric balance**, **tonal layering**, and **cinematic white space**. 

The goal is to make the user feel like they are paging through a premium linen-bound travel journal. We achieve this through "The Breathable Grid"—where elements are allowed to overlap, and white space is treated as a functional design element rather than "empty" space.

---

## 2. Colors & Surface Philosophy
The palette draws from the lacquered reds of the Temple of Literature and the sun-bleached yellows of French Quarter villas.

### The "No-Line" Rule
**Traditional 1px solid borders are strictly prohibited.** 
Structure is defined through color-blocking and tonal transitions. To separate a navigation bar or a card section, transition from `surface` (#faf9f6) to `surface-container-low` (#f4f3f1). This creates a sophisticated, "Notion-style" airiness that feels organic rather than mechanical.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following tiers to define depth:
- **Base Layer:** `surface` (#faf9f6) for global backgrounds.
- **Content Sections:** `surface-container-low` (#f4f3f1) for large grouped content areas.
- **Interactive Elements/Cards:** `surface-container-lowest` (#ffffff) to provide a soft "lift" against the background.

### The "Glass & Gradient" Rule
For hero sections or primary CTAs, use a subtle linear gradient: `primary` (#b52330) to `primary_container` (#ff5a5f). This adds "soul" and prevents the vibrant orange from feeling flat or digital. Floating navigation menus should utilize **Glassmorphism**: use `surface_container_lowest` at 80% opacity with a `backdrop-filter: blur(12px)` to allow the rich travel photography to bleed through the edges.

---

## 3. Typography: Editorial Authority
We utilize a pairing of **Be Vietnam Pro** for character and **Inter** for utility.

- **Display & Headlines (Be Vietnam Pro):** These are our "Editorial Voices." Use `display-lg` (3.5rem) with tight letter-spacing for hero titles. The serif-like weight of Be Vietnam Pro in these scales provides an authoritative, premium feel.
- **Body & Labels (Inter):** These are our "Functional Voices." `body-lg` (1rem) should be used for descriptions with a generous line-height (1.6) to maintain the airy aesthetic. 
- **The Hierarchy Rule:** Never use more than three levels of hierarchy on a single screen. Contrast a `headline-sm` with a `body-md` to create immediate visual clarity without clutter.

---

## 4. Elevation & Depth
In this system, depth is felt, not seen.

### The Layering Principle
Avoid drop shadows for standard UI components. Instead, stack `surface_container_lowest` (#ffffff) on top of `surface_container` (#efeeeb). This "Tonal Lift" creates a high-end, tactile quality reminiscent of fine stationery.

### Ambient Shadows
Where floating elements (like a "Book Now" FAB) are required, use an **Ambient Shadow**:
- **Blur:** 24px - 40px.
- **Spread:** -4px.
- **Color:** `on_surface` (#1a1c1a) at 4% to 6% opacity. 
This mimics natural light rather than a digital "drop shadow."

### The "Ghost Border" Fallback
If a boundary is required for accessibility (e.g., in a search input), use a **Ghost Border**: `outline_variant` (#e2bebc) at 20% opacity. This provides a "suggestion" of a container without breaking the fluid visual flow.

---

## 5. Components

### Buttons
- **Primary:** Gradient from `primary` to `primary_container`. `xl` roundedness (1.5rem). No shadow.
- **Secondary:** `secondary_container` (#eddec5) with `on_secondary_container` text.
- **Tertiary/Ghost:** No background. Bold `primary` text. Use for low-priority actions like "View Details."

### Cards & Lists
**Forbid the use of divider lines.** 
Separate itinerary items using 24px of vertical white space or a subtle shift to `surface_container_low`. 
- **Image Treatment:** Use `lg` (1rem) corner radius. Photography must be high-contrast, authentic, and "human-centric."

### Inputs & Search
- Use `surface_container_lowest` (#ffffff) for the input field background.
- Instead of a border, use a subtle 2px bottom-stroke of `primary_fixed` (#ffdad8) only when the field is focused.

### Chips (Travel Tags)
- Use `secondary_fixed` (#f0e0c8) for category tags (e.g., "Architecture," "Street Food"). 
- Rounding: `full` (9999px).

### The "Itinerary Timeline" (Custom Component)
Instead of a literal line, use a series of staggered `surface_container_high` dots. The "current" stop is highlighted by a `tertiary` (#006e25) action indicator.

---

## 6. Do's and Don'ts

### Do:
- **Do** use asymmetrical margins. Offsetting a headline from a body block creates an "editorial" look.
- **Do** use large, high-quality images that bleed off the edge of the screen to create a sense of scale.
- **Do** use `tertiary` (#006e25) sparingly for success states or "Verified" badges to maintain the heritage feel.

### Don't:
- **Don't** use 1px black or grey borders. They feel "cheap" and digital.
- **Don't** cram content. If a screen feels busy, increase the white space by 20%.
- **Don't** use generic stock icons. Use clean, thin-stroke (1.5pt) SVG icons that feel custom-drawn.
- **Don't** use pure #000000 for text. Use `on_surface` (#1a1c1a) for a softer, more premium reading experience.