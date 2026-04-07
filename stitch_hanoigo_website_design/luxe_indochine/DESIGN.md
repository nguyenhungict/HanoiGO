# Design System: The Curated Heritage

## 1. Overview & Creative North Star
**Creative North Star: "The Modern Archivist"**

This design system moves away from the "generic travel portal" and toward a high-end editorial experience. We are not just selling tickets; we are curating an atmosphere. The aesthetic bridges the gap between Hanoi’s rich, tactile history and a hyper-modern digital interface. 

By leveraging **Asymmetric Composition** and **Tonal Depth**, we break the traditional grid. We use generous white space to allow high-end photography to breathe, treating the screen like a premium travel magazine where the UI serves as a sophisticated frame rather than a container.

---

## 2. Colors & Surface Philosophy

The color palette is rooted in the vibrant energy of Hanoi (Primary #FF5A5F) and its colonial heritage (Secondary #F7E7CE). 

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders for sectioning or containment. 
Boundaries are defined through:
1.  **Background Shifts:** Transitioning from `surface` to `surface-container-low`.
2.  **Tonal Transitions:** Using `surface-container` tiers to create logical groupings.
3.  **Negative Space:** Using the spacing scale to create invisible boundaries.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper. 
- **Base Layer:** `surface` (#FFF8F7) - The foundation of the page.
- **Sectional Layer:** `surface-container-low` (#FFF0EF) - Used for large content blocks (e.g., the search results area).
- **Interactive Layer:** `surface-container` (#FFE9E7) - Used for cards and secondary navigation elements.
- **Floating Layer:** `surface-container-highest` (#F7DCDB) - Reserved for modals, dropdowns, and "active" elevated states.

### The Glass & Signature Texture
To achieve a "Signature" feel, use **Glassmorphism** for the horizontal navigation bar and hero search overlay.
- **Value:** `surface` at 80% opacity with a `backdrop-filter: blur(20px)`.
- **Gradients:** Use a subtle linear gradient on Primary CTAs: `primary` (#B52330) to `primary-container` (#FF5A5F) at a 135-degree angle. This adds "soul" and dimension that flat hex codes cannot provide.

---

## 3. Typography: Editorial Authority

We use **Inter** not as a system font, but as a precision tool. The hierarchy is designed to feel authoritative yet welcoming.

*   **Display (Display-LG/MD):** Used for hero statements. Set with -0.02em letter spacing to feel "tight" and premium.
*   **Headlines (Headline-LG/MD):** Use for section titles. These should often be placed asymmetrically to lead the eye.
*   **Body (Body-LG):** The workhorse. Set at `1rem` with a generous line height (1.6) to ensure maximum readability against the cream-toned surfaces.
*   **Labels (Label-MD/SM):** All-caps with +0.05em letter spacing for "overline" metadata, evoking the feel of a museum plaque.

---

## 4. Elevation & Depth

### The Layering Principle
Avoid the "Shadow Gallery" look. Instead of applying shadows to every card, stack the `surface-container` tokens. A `surface-container-lowest` card sitting on a `surface-container-low` background provides a soft, natural "lift" without visual noise.

### Ambient Shadows
When a floating effect is required (e.g., the Hero Search bar):
- **Shadow:** `0px 12px 32px rgba(38, 24, 23, 0.06)`. 
- **Note:** The shadow is tinted with the `on-surface` color (#261817), making it feel like natural ambient light rather than a grey smudge.

### The "Ghost Border" Fallback
If a border is legally or functionally required for accessibility:
- Use `outline-variant` (#E2BEBC) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Navigation & Search (The Hero)
- **Horizontal Bar:** Fixed at the top, utilizing the Glassmorphism rule. No bottom border; use a `surface-dim` shadow on scroll.
- **Hero Search:** A pill-shaped container (`rounded-full`) using `surface-container-lowest`. Inputs are separated by generous vertical padding, not lines.

### Buttons
- **Primary:** Gradient-filled (`primary` to `primary-container`), `rounded-md`, white text. No shadow.
- **Secondary:** `surface-secondary-container` background with `on-secondary-container` text.
- **Tertiary:** Pure text with a subtle `primary` underline that expands on hover.

### Cards & Lists
- **Rule:** Forbid divider lines. 
- **Implementation:** Group information using `title-md` and `body-sm`. Separate "Stay" cards from "Experience" cards using a `surface-container-low` background wrapper for one of the categories.
- **Imagery:** Cards must feature "Authentic Hanoi" photography. Apply a `rounded-lg` corner to all images.

### Selection Chips
- Use `secondary-container` with `on-secondary-container` text. Shapes must be `rounded-full` to contrast against the more architectural `rounded-md` buttons.

---

## 6. Do’s and Don’ts

### Do
- **Do** use intentional asymmetry. Place a headline 24px further left than the body text to create a high-fashion editorial look.
- **Do** prioritize authentic photography. The image is the hero; the UI is the concierge.
- **Do** use "Surface Tones" to group related items (e.g., a flight and a hotel booking in one `surface-container` block).

### Don’t
- **Don't** use 1px solid borders. This is the quickest way to make a premium system look "cheap."
- **Don't** use AI-generated illustrations or 3D "blobs." They contradict the "Heritage" aspect of the brand.
- **Don't** use pure black (#000000) for text. Always use `on-surface` (#261817) for a softer, more expensive feel.
- **Don't** crowd the layout. If you think it needs more content, it probably needs more white space.