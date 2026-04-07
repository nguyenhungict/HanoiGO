# Design System: The Editorial Hub

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Curator"**

This design system rejects the "boxed-in" nature of traditional social networks in favor of a high-end editorial experience. We aim to mimic the feeling of a premium travel magazine—expansive, airy, and deeply intentional. By leveraging **Asymmetric Composition** and **Tonal Depth**, we break the rigid grid. Elements should feel as though they are resting on a surface rather than being trapped within a container. 

The "Digital Curator" aesthetic relies on three pillars:
*   **Breathing Room:** Aggressive use of white space to let high-end photography shine.
*   **Layered Sophistication:** Depth created through subtle color shifts rather than structural lines.
*   **Typographic Authority:** Using the Inter scale to create a clear, rhythmic hierarchy that guides the user through complex community interactions.

---

## 2. Colors & Surface Logic

Our palette moves away from flat application, favoring tonal shifts that evoke a sense of physical material.

### The "No-Line" Rule
**Borders are strictly prohibited for sectioning.** To define boundaries, you must use background shifts. A `surface-container-low` card sitting on a `surface` background creates a natural edge. If a section needs to feel distinct, shift the entire background to `surface-container-lowest`.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine-paper layers.
*   **Base:** `surface` (#f9f9f9) for the primary application background.
*   **Low Elevation:** `surface-container-low` (#f3f3f3) for subtle content grouping.
*   **High Contrast:** `surface-container-lowest` (#ffffff) for primary cards or interactive elements to make them "pop" against the slightly darker background.

### The "Glass & Gradient" Rule
To add soul to the "Modern" brand personality:
*   **Glassmorphism:** Use `surface-container-lowest` at 70% opacity with a `24px` backdrop blur for floating navigation bars or overlaying metadata on photography.
*   **Signature Textures:** For primary CTAs, use a subtle linear gradient from `primary` (#b52330) to `primary-container` (#ff5a5f) at a 135-degree angle. This prevents the vibrant orange from feeling "flat" and adds a premium sheen.

---

## 3. Typography: Inter Editorial

We use **Inter** not as a utility font, but as a brand anchor. The contrast between massive `display` sizes and tight `label` sizes creates the "Sophisticated" feel.

*   **Display (lg/md):** Reserved for high-impact travel destinations. Use `-0.02em` letter spacing to give it an authoritative, "locked-in" editorial look.
*   **Headlines:** Used for section headers. Ensure there is significant vertical rhythm (at least `48px` of top margin) to maintain the "Airy" requirement.
*   **Body (lg/md):** The workhorse for community stories. Keep line heights generous (`1.6`) to ensure readability during long-form travelogues.
*   **Labels:** Always uppercase with `0.05em` letter spacing when used for categories (e.g., "TRIP REPORT") to distinguish them from interactive metadata.

---

## 4. Elevation & Depth

### The Layering Principle
Forget shadows as a default. Use **Tonal Layering**.
*   **Level 0:** `surface` (The Floor)
*   **Level 1:** `surface-container-low` (Secondary content)
*   **Level 2:** `surface-container-lowest` (Interactive cards)

### Ambient Shadows
When an element must float (e.g., a "Create Post" FAB), use an **Ambient Shadow**:
*   **Blur:** `32px` to `48px`
*   **Opacity:** 4-6%
*   **Color:** Use a tinted shadow based on `on-surface` (#1a1c1c) rather than pure black.

### The "Ghost Border" Fallback
In rare accessibility cases where a border is required, use the `outline-variant` token at **15% opacity**. This creates a "suggestion" of a boundary without breaking the light and airy aesthetic.

---

## 5. Components

### Buttons & CTAs
*   **Primary:** Rounded `full`. Gradient fill (`primary` to `primary-container`). No shadow; use a `surface-tint` glow on hover.
*   **Secondary:** `surface-container-highest` background with `on-surface` text. Feels "carved" out of the interface.
*   **Tertiary:** Pure text with `primary` color. High padding (`12px 24px`) to maintain a large hit state without visual clutter.

### Input Fields
*   **Style:** No bottom line or box outline. Use a `surface-container-high` background with a `md` (0.75rem) corner radius.
*   **Focus State:** Shift background to `surface-container-lowest` and apply a soft `primary` ambient shadow.

### Editorial Cards
*   **Rule:** **Zero Dividers.** 
*   **Structure:** Use `xl` (1.5rem) corner radius. Imagery should be full-bleed at the top or left. 
*   **Content Spacing:** Use `24px` internal padding (Spacing Scale) to separate the title from the metadata. Use tonal shifts (`surface-variant`) for the footer area of the card instead of a line.

### Travel-Specific Components
*   **Photography Hero:** Always utilize a `16:9` or `21:9` aspect ratio. Metadata (Location, Author) should be "Glassmorphic" tags floating in the bottom-left corner.
*   **Community Bubbles:** Overlapping `full` radius avatars with `2px` "Ghost Borders" in `surface` color to create separation.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical layouts (e.g., a left-aligned headline with a right-aligned image slightly offset).
*   **Do** use `tertiary` (#006e25) sparingly for "Success" or "Verified" states to maintain the premium feel.
*   **Do** prioritize high-end, authentic photography. If the photo is low-quality, the entire design system fails.

### Don't
*   **Don't** use 1px solid borders. Ever.
*   **Don't** use standard "Drop Shadows" with high opacity or small blurs.
*   **Don't** overcrowd the screen. If you're unsure, add `16px` more margin.
*   **Don't** use default Inter tracking for large headers; it looks too much like a standard SaaS app. Tighten it.