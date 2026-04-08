# HanoiGO Design System

This document defines the visual theme and design principles for the HanoiGO project. All new pages and components MUST adhere to these tokens to ensure a unified, premium aesthetic.

## 🎨 Color Palette

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `primary` | `#FF5A5F` | Main brand color, primary buttons, highlights. |
| `primary-container` | `#FF8A8E` | Subtle primary backgrounds, secondary highlight. |
| `on-primary` | `#FFFFFF` | Text/Icons on top of primary color. |
| `secondary` | `#F7E7CE` | Champagne/Beige, used for card backgrounds, secondary actions. |
| `secondary-container` | `#FAF0E1` | Very light champagne for sections or containers. |
| `on-secondary` | `#413010` | Dark brown text for secondary backgrounds. |
| `tertiary` | `#28A745` | Success states, eco-friendly badges, active status. |
| `tertiary-container` | `#48C765` | Light green for container highlights. |
| `background` | `#FCF8F2` | Main page background (Off-white/Cream). |
| `surface` | `#FCF8F2` | Surface for cards and elements. |
| `on-surface` | `#261817` | Main text color (Dark brown/black). |
| `on-surface-variant` | `#6C614E` | Subtext, captions, and secondary text. |
| `outline` | `#8E706F` | Borders and dividers. |

## Typography

- **Main Font Family**: `Inter`, sans-serif.
- **Headlines**: Semi-bold to Extra-bold, tight tracking (`tracking-tighter`), larger sizes for impact.
- **Body**: Regular to Medium weight, comfortable line heights.
- **Labels**: Bold, often uppercase, with wide tracking for a premium feel.

## UI Patterns

### 1. Bento Grid
Use asymmetric grids for discovery sections. Large cards for main attractions, smaller cards for supporting content.
- `rounded-xl` (12px) for most containers.
- `shadow-sm` or none for a clean, minimalist look.

### 2. Glassmorphism
Navigation bars and overlays should use backdrop blur.
- `bg-white/80` or `bg-surface/80` with `backdrop-blur-xl`.

### 3. Buttons
- **Primary**: Solid `#FF5A5F` with white text.
- **Secondary**: Solid `#F7E7CE` with dark text.
- **Inverted**: Solid `#261817` with white text.
- **Outlined**: Transparent with `#8E706F` border.

### 4. Interactive Elements
- Hover effects should be subtle scaling (`hover:scale-[1.01]`) or opacity shifts.
- Fast, smooth transitions (`transition-all duration-300`).

## 🛠️ Implementation (Tailwind)

Always use semantic tokens:
- `bg-primary` instead of `bg-rose-500`
- `bg-secondary` instead of `bg-beige-100`
- `text-on-surface` instead of `text-neutral-900`
- `bg-background` for page containers.
