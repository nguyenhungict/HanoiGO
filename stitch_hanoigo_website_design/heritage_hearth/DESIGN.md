# Design System Specification: Editorial Heritage

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Curated Heritage."** 

Hanoi is a city of layers—ancient stone, colonial ochre, and vibrant modern energy. This design system must reflect that depth by moving away from the "flat web." We reject the rigid, boxed-in layouts of standard travel apps in favor of an editorial, magazine-like experience. 

The aesthetic is driven by **intentional asymmetry** and **tonal layering**. By eliminating 1px borders, we force the design to breathe through white space and subtle shifts in surface color. The result is a digital environment that feels like a premium travel journal: high-contrast, sophisticated, and deeply authentic.

---

## 2. Colors & Surface Logic

This system utilizes a tonal palette that prioritizes depth over decoration. We use the Material Design surface-container convention to define hierarchy without the need for structural lines.

### The Palette
- **Primary (`#b52330` / `#ff5a5f`):** Used for brand moments and high-priority actions. It is a "Living Rose"—vibrant yet grounded.
- **Secondary (`#685d4a` / `#f7e7ce`):** "Heritage Yellow." This is used to evoke the historic architecture of Hanoi. It should be used for background accents and subtle container fills.
- **Tertiary/Action (`#006e25` / `#28a745`):** "Lush Green." Reserved strictly for success states and growth-oriented actions.
- **Neutral/Surface:** A range of greys from `surface-container-lowest` (`#ffffff`) to `surface-dim` (`#dadada`).

### The "No-Line" Rule
**Designers are strictly prohibited from using 1px solid borders for sectioning or containment.** 
Boundaries must be created using:
- **Tonal Shifts:** Placing a `surface-container-low` (`#f3f3f3`) card against a `surface` (`#f9f9f9`) background.
- **Negative Space:** Using the spacing scale to allow the eye to perceive groupings naturally.

### Glass & Gradient Logic
To elevate the experience, floating elements (like navigation bars or hovering price tags) should use **Glassmorphism**:
- **Fill:** `surface-container-lowest` at 80% opacity.
- **Effect:** Backdrop blur of 20px–30px.
- **Signature Gradient:** For Hero CTAs, use a subtle linear gradient from `primary` (`#b52330`) to `primary-container` (`#ff5a5f`) at a 135-degree angle. This adds a "soul" and physical presence to the button that flat color cannot achieve.

---

## 3. Typography: The Editorial Scale

We use **Inter** exclusively, but we treat it with editorial weight. The hierarchy is designed to guide the traveler’s eye through stories, not just data points.

| Role | Weight | Size | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Display-LG** | Bold | 3.5rem | -0.02em | Hero headlines, destination names. |
| **Headline-SM** | Semi-Bold | 1.5rem | -0.01em | Section headers, card titles. |
| **Title-MD** | Medium | 1.125rem | 0 | Sub-headers, secondary navigation. |
| **Body-LG** | Regular | 1rem | 0 | Long-form descriptions, storytelling. |
| **Label-MD** | Medium | 0.75rem | +0.04em | Uppercase metadata (e.g., "OLD QUARTER"). |

**Creative Rule:** Use `display-lg` text to overlap imagery slightly. This "breaks the grid" and connects the typography to the photography, creating a cohesive, high-end feel.

---

## 4. Elevation & Depth: The Layering Principle

Depth is not added; it is revealed. We use **Tonal Layering** to create a physical sense of "stacked fine paper."

- **The Stacking Rule:**
    - Background: `surface` (`#f9f9f9`)
    - Primary Content Area: `surface-container-low` (`#f3f3f3`)
    - Interaction Cards: `surface-container-lowest` (`#ffffff`)
- **Ambient Shadows:** Shadows should only be used on floating elements (e.g., Modals). Use a blur of 32px, 0px Y-offset, and 4% opacity of the `on-surface` color. It should feel like a soft glow, not a drop shadow.
- **The "Ghost Border" Fallback:** If a border is required for accessibility in forms, use `outline-variant` (`#e2bebc`) at **15% opacity**. It should be barely perceptible.

---

## 5. Components

### Buttons (The "Signature" CTA)
- **Primary:** Gradient (`primary` to `primary-container`), `round-md` (0.375rem). No shadow.
- **Secondary:** Ghost style. No border. Use `secondary-container` (`#eddec5`) as the background fill. Text in `on-secondary-fixed-variant`.
- **Tertiary:** Text-only with an icon. No container.

### Cards & Lists
- **The Card Rule:** No borders, no dividers. Separate cards using `surface-container-low` backgrounds or 32px of vertical white space. 
- **Photography:** Every card must feature one high-end, authentic photograph. No AI, no stock vectors. The photo should occupy at least 40% of the card area.

### Input Fields
- **Style:** Use a "Soft Inset" look. Fill with `surface-container-high` (`#e8e8e8`). On focus, transition the background to `surface-container-lowest` (`#ffffff`) and add a 2px `primary` ghost border at 20% opacity.

### Navigation Bar
- **Style:** Glassmorphic. `surface-container-lowest` at 85% opacity with a heavy backdrop blur. No bottom border. Use a subtle `surface-dim` shadow to separate it from the content scrolling beneath.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use large amounts of white space. If you think there is enough space, add 16px more.
- **Do** use intentional asymmetry. For example, left-align headlines but right-align supporting metadata to create visual tension.
- **Do** prioritize "Heritage Yellow" (`#f7e7ce`) for background washes behind text-heavy sections to reduce eye strain and add warmth.

### Don’t:
- **Don’t** use 1px solid borders. Ever.
- **Don’t** use AI-generated icons or illustrations. This design system relies on the "Human Touch." Use authentic photography or clean, geometric iconography.
- **Don’t** use pure black (#000000) for text. Use `on-surface` (`#1a1c1c`) to maintain a premium, ink-on-paper feel.
- **Don’t** use traditional "Dividers." Use a change in background color or a 48px gap to separate content blocks.

---

## 7. Imagery Statement
Images are not decoration; they are the primary UI element. All photography must be **authentic travel photography**—captured with natural light, featuring real textures of Hanoi (weathered wood, silk, steam from a bowl of Phở). Avoid high-saturation "tourist" shots; prefer the "National Geographic" editorial style.