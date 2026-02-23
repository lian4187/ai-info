# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

This is a **Claude Code Skills** repository. It contains the `ui-ux-pro-max` skill — a UI/UX design intelligence system that generates comprehensive design system recommendations by searching interconnected knowledge bases.

The skill is invoked automatically when users ask for UI/UX work (websites, landing pages, dashboards, components, etc.).

## Running the Scripts

All scripts use Python 3 with standard library only (no dependencies to install).

```bash
# Generate a design system for a product
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard analytics" --design-system -p "MyApp"

# Save design system to files (MASTER.md + optional page overrides)
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "SaaS dashboard" --design-system --persist -p "MyApp"

# Generate a page-specific override
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "dashboard" --design-system --persist -p "MyApp" --page "dashboard"

# Search a specific domain
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "glassmorphism dark mode" --domain style -n 5

# Get stack-specific guidelines
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "layout form responsive" --stack react
```

Available `--domain` values: `product`, `style`, `typography`, `color`, `landing`, `chart`, `ux`, `react`, `web`, `icon`

Available `--stack` values: `html-tailwind`, `react`, `nextjs`, `vue`, `svelte`, `astro`, `nuxtjs`, `nuxt-ui`, `shadcn`, `swiftui`, `react-native`, `flutter`, `jetpack`

## Architecture

### Search Engine (`scripts/core.py`)
BM25 (Okapi BM25) ranking algorithm with a custom tokenizer. Loads CSV knowledge bases on demand. Domain auto-detection maps query keywords to the most relevant CSV file when no `--domain` is specified.

### CLI Entry Point (`scripts/search.py`)
Parses arguments and dispatches to either:
- **Domain search:** single-domain BM25 query, returns top-N rows
- **Design system generation:** calls `design_system.py` workflow

### Design System Generator (`scripts/design_system.py`)
Four-step pipeline:
1. Detect product category from query (SaaS, e-commerce, healthcare, etc.)
2. Load reasoning rules (`data/ui-reasoning.csv`) for that category
3. Execute parallel BM25 searches across `product`, `style`, `color`, `landing`, `typography` domains
4. Synthesize results into a complete design system (style, palette, fonts, effects, anti-patterns, checklist)

### Knowledge Bases (`data/*.csv`)
All domain knowledge is stored as CSV files. Key files:

| File | Content |
|------|---------|
| `ui-reasoning.csv` | Decision rules mapping product categories → design patterns |
| `products.csv` | 95 product types with style/color recommendations |
| `styles.csv` | 67 UI styles (glassmorphism, brutalism, minimalism, etc.) |
| `colors.csv` | 96 color palettes organized by product type |
| `typography.csv` | 57 font pairings |
| `landing.csv` | Landing page patterns and conversion strategies |
| `ux-guidelines.csv` | UX best practices and accessibility rules |
| `stacks/*.csv` | Per-framework guidelines (13 frameworks, ~50–60 rows each) |

### Output & Persistence
Design systems can be output as ASCII box (terminal) or markdown. With `--persist`, files are written to:
- `design-system/<project-name>/MASTER.md` — global rules
- `design-system/<project-name>/pages/<page-name>.md` — page-specific overrides

The **MASTER + Overrides** pattern means page files only contain differences from MASTER.

Communicate with me in Chinese only.

## Skill Invocation (SKILL.md)
The full skill workflow, design rules, and usage examples are documented in `.claude/skills/ui-ux-pro-max/SKILL.md`. Read this file before making changes to the skill's behavior or knowledge bases.
