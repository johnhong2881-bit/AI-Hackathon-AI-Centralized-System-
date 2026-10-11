# PlanPilot AI - Hackathon Pitch Deck DESIGN.md

## 1. Canvas & Master Layout

- Canvas: 1280 x 720px (16:9)
- All content pages use the A/B/C three-zone master:

| Zone | Vertical Position | Height | Content Rule |
|------|-------------------|--------|-------------|
| A - Title block | 0-120px | 120px (incl. top padding 20) | Main title 32-40px bold |
| B - Content area | 120-660px | 540px usable | All content, charts, cards |
| C - Footer bar | 660-720px | 60px (incl. bottom padding 20) | Left: "PlanPilot AI" / Right: page number "NN / 10" |
| Padding | top/bottom 20px, left/right 60-80px | - | A/B/C within padding |

Cover (slide 1) and ending (slide 10) use custom layouts, skip C zone.

## 2. Color System

| Role | HEX | Usage |
|------|-----|-------|
| Background | #FFFFFF | Page background |
| Surface | #F8FAFC (slate-50) | Card backgrounds, subtle areas |
| Main (primary) | #3B82F6 (blue-500) | Title bars, key UI elements, primary accents |
| Accent (secondary) | #06B6D4 (cyan-500) | Data highlights, gradient endpoints, type badges |
| Success/Rescue | #10B981 (emerald-500) | "After rescue" indicators, positive stats |
| Risk/Danger | #EF4444 (red-500) | "Before rescue" indicators, risk flags |
| Text primary | #0F172A (slate-900) | Headlines, body text |
| Text secondary | #64748B (slate-500) | Captions, descriptions, footer |
| Border | #E2E8F0 (slate-200) | Card borders, dividers |

### Color Area Allocation

| Color role | Area ratio | Notes |
|------------|-----------|-------|
| Main (blue) | <= 55% | Title bars, gradient backgrounds, primary UI |
| Accent (cyan) | <= 25% | Highlights, badges, secondary cards |
| Success/Risk | <= 10% | Only on before/after comparison slide |
| Neutral | remaining | Text, whitespace, borders |

### Hero page color boost
- Slide 1 (cover): accent up to 20% (gradient overlay)
- Slide 6 (demo): accent up to 15% (giant numbers)
- Slide 10 (ending): accent up to 15% (gradient text)

## 3. Gradients & Transparency

- Primary gradient: `linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)` - used for title bars, cover background, hero text
- Subtle overlay: `rgba(59, 130, 246, 0.08)` - large area semi-transparent coverage
- Card shadow: `boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'` - card elevation
- Dark overlay on cover: `rgba(15, 23, 42, 0.75)` - for white text readability over gradient

## 4. Typography

| Level | Size (px) | Weight | Line Height | Usage |
|-------|-----------|--------|-------------|-------|
| Cover title | 72 | bold | 1.1 | Slide 1 only |
| Giant number | 96-120 | bold | 1.0 | Slide 6 anchor numbers |
| Ending text | 56 | bold | 1.2 | Slide 10 |
| Page title | 36 | bold | 1.3 | A zone, all content pages |
| Subtitle | 24 | 600 | 1.4 | Card headers, section labels |
| Body text | 20 | regular | 1.5 | Paragraphs, descriptions |
| Caption | 16 | regular | 1.4 | Stats, labels, footer |
| Badge | 14 | 600 | 1.2 | Type badges (LLM/Deterministic) |
| Footer | 14 | regular | 1.4 | C zone, page numbers |

### Font Families

| Role | Font | Personality |
|------|------|-------------|
| All text | Inter | Modern, clean, tech |
| Numbers/data | Inter (bold) | Consistent with body |
| Mono (code/IDs) | JetBrains Mono | Technical accents |

## 5. Image System

All visuals use SVG/FAIcon (no photographic ImageGen needed - this is a tech architecture deck).

| Level | Usage | Min Size | Access |
|-------|-------|----------|--------|
| L1 - Main visual | Page narrative anchor | B area >= 40% | SVG diagrams, gradient backgrounds |
| L2 - Supporting | Paragraph reinforcement | >= 280x180 | FAIcon in cards |
| L3 - Footer mark | Global corner element | <= 64x64 | "TF" monogram in footer bar |

## 6. Page Mapping Table

| # | File | Type | Role | Layout | L1 Visual | Words | Whitespace | Color Alloc | Key Constraint |
|---|------|------|------|--------|-----------|-------|-----------|-------------|----------------|
| 01 | 01.slide | cover | hero | full-screen overlay | gradient mesh bg | 25 | 35% | main50%+accent20% | No C zone; gradient bg + overlay text |
| 02 | 02.slide | content | supporting | non-sym dual (60:40) | icon cards (SVG) | 200 | 25% | main40%+accent15% | Left=3 pain points, right=stat card |
| 03 | 03.slide | content | supporting | left-visual + right text | pipeline flow (SVG) | 120 | 30% | main45%+accent15% | Left 55% diagram, right 45% text |
| 04 | 04.slide | content | supporting | non-sym dual (55:45) | arch diagram (SVG) | 180 | 25% | main40%+accent15% | Two-layer architecture diagram |
| 05 | 05.slide | content | supporting | left-title + right content | agent list (FAIcon) | 280 | 20% | main35%+accent15% | 6 agents vertical, type badges |
| 06 | 06.slide | content | hero | giant-number + insights | giant numbers (text) | 150 | 35% | accent20% | 3 numbers >= 96px, no card grid |
| 07 | 07.slide | content | supporting | top-visual + bottom cards | before/after bar (SVG) | 220 | 25% | main30%+risk10%+success5% | Red vs green comparison bars |
| 08 | 08.slide | content | supporting | non-sym dual (60:40) | evidence list (FAIcon) | 200 | 25% | main40%+accent15% | 5 evidence items with icons |
| 09 | 09.slide | content | supporting | left-title + right content | tech icons (FAIcon) | 200 | 25% | main35%+accent10% | Stack list + team split |
| 10 | 10.slide | ending | hero | centered giant text | gradient text | 20 | 50% | main30%+accent15% | Minimal, maximum impact |
