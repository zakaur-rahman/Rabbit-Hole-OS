# Web Redesign — Cognode "Ink & Paper" Aesthetic

The `apps/web` landing page and changelog have been completely redesigned to follow a premium "Ink and Paper" aesthetic, focusing on sophisticated typography and a refined color palette.

## 🎨 New Design System

- **Color Palette**:
  - `Ink` (#0d0d0b) for primary text and elements.
  - `Paper` (#f5f0e8) for the main background.
  - `Amber` (#c8860a) for accents and interactive elements.
  - `Cream` (#ede8dc) for alternative section backgrounds.
  - `Rule` (#c8b89a) for sophisticated borders and dividers.
- **Typography**:
  - `Playfair Display`: Used for expressive, high-impact headings and brand elements.
  - `DM Mono`: Used for technical details, labels, and sub-content to maintain a "research lab" feel.

## 🚀 Key Improvements

- **Interactive Node Canvas**: Added a custom `NodeCanvas` component to the hero background that features particle-based nodes that repel from the mouse cursor and connect with animated edges.
- **Sectioned Storytelling**: The landing page now flows through a structured narrative:
  - **Hero**: High-impact headline with an animated Knowledge Graph SVG.
  - **Marquee**: Sliding marquee of supported file types (`PDF`, `MARKDOWN`, etc.).
  - **Stats**: Key platform metrics with bold serif typography.
  - **Features**: Bento-grid style layout for core capabilities.
  - **Pipeline**: A step-by-step workflow visualization.
  - **Privacy**: Clear communication of the local-first data integrity.
- **Redesigned Changelog**: The changelog page now pulls directly from GitHub Releases and renders them in the new aesthetic with improved readability and a back-navigation link.

## 🛠 Tech Stack & Build
- Built with **Next.js** and **Tailwind CSS v4**.
- Fully responsive across desktop and mobile.
- Build verified with `npm run build --workspace=apps/web`.

## 📂 Components Cleaned Up
- Removed unused legacy components: `FileFreedom.tsx`, `HowItWorks.tsx`, and `HeroCanvas.tsx`.
