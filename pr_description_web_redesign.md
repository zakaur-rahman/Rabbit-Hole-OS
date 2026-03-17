# PR: Cognode Web Redesign — "Ink & Paper" Aesthetic

## Description
This PR implements a complete redesign of the Cognode landing page and changelog, migrating from the previous dark-centric design to a sophisticated "Ink and Paper" aesthetic. The new design prioritizes premium typography (Playfair Display, DM Mono) and a curated color palette to evoke a modern research lab feel.

## Key Changes
- **Global Theme**: Implemented a new design token system in [globals.css](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/app/globals.css) using Tailwind CSS v4.
- **Typography**: Integrated `Playfair_Display` and `DM_Mono` via `next/font/google`.
- **Hero Section**: Added an interactive [NodeCanvas](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/components/landing/NodeCanvas.tsx#5-137) background with mouse-repel physics and a high-impact split layout with animated SVG graph.
- **New Modular Components**:
  - [Marquee](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/components/landing/Marquee.tsx#7-22): Dynamic display of supported file formats.
  - [Stats](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/components/landing/Stats.tsx#12-27): Platform metrics with stylized typography.
  - [Features](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/components/landing/Features.tsx#33-84): Bento-grid layout for platform capabilities.
  - [Pipeline](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/components/landing/Pipeline.tsx#13-62): Visualized workflow for knowledge work.
  - [Privacy](file:///c:/Users/zakau/Rabbit-Hole-OS/apps/web/components/landing/Privacy.tsx#6-68): Emphasis on local-first data integrity.
- **Redesigned Navbar/Footer**: Updated to match the "Ink and Paper" aesthetic with glassmorphism and refined borders.
- **Redesigned Changelog**: Improved readability and visual consistency with the new theme while maintaining GitHub API integration.

## Verification
- Succesfully ran production build: `npm run build --workspace=apps/web`.
- Verified responsiveness across mobile, tablet, and desktop viewports.
- Cleaned up unused legacy components.

## Screenshots / Recording
> [!NOTE]
> Please refer to the [Web Redesign Walkthrough](file:///c:/Users/zakau/.gemini/antigravity/brain/0f27e30d-3d4b-4b56-a1cc-c27f4779d977/walkthrough_web_redesign.md) for detailed visuals.
