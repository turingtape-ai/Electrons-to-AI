# Signal to Thought

An educational website telling the story of computing from before electricity
to modern AI and a little past it. Hardware and software together, chaptered
like a book, one small concrete step per chapter, ending with how transformer
models and language models actually work.

Live site: deployed to GitHub Pages from the default branch by the workflow in
`.github/workflows/deploy.yml`.

## Stack

- [Astro](https://astro.build) static site, dark theme only.
- Chapters are MDX files in a content collection.
- Interactive diagrams are small vanilla-JS web components, used from MDX as a
  single tag each.
- Two dependencies: `astro` and `@astrojs/mdx`. Fonts (Newsreader, Instrument
  Sans) are loaded from Google Fonts.

## Getting started

```sh
npm install
npm run dev       # http://localhost:4321/Electrons-to-AI/
npm run build     # static output in dist/
npm run preview   # serve dist/ locally
```

The site is built with a base path matching the repository name because
GitHub Pages serves project sites under `/<repo>/`. The workflow sets
`SITE_URL` and `SITE_BASE` from the repository; local builds fall back to the
values in `astro.config.mjs`.

## Project structure

```
src/
  content.config.ts            Schema for the chapters collection
  content/chapters/*.mdx       One file per chapter (01-beacons.mdx, ...)
  data/parts.ts                The nine Parts, in order, with blurbs
  lib/chapters.ts              Sorting, grouping, URL helpers
  layouts/Base.astro           HTML shell: fonts, sidebar, phone drawer
  components/
    Sidebar.astro              Parts and chapters, progress line
    TryIt.astro                Bordered panel that frames an interactive
    CarryForward.astro         "What to carry forward" callout
    NextCard.astro             Next/previous chapter navigation
    interactives/
      index.js                 Registers every custom element
      shared.js                Styles and helpers shared by interactives
      beacon-chain.js          <beacon-chain>
      semaphore-tower.js       <semaphore-tower>
  pages/
    index.astro                Home page with the table of contents
    about.astro                About page
    chapters/[slug].astro      Chapter page template
  styles/global.css            Palette, type, layout
public/favicon.svg
.github/workflows/deploy.yml   Build on every push; deploy from default branch
```

## Writing a chapter

Create `src/content/chapters/NN-slug.mdx` with this frontmatter:

```yaml
---
title: "Fires on the Hills"
deck: "One italic sentence under the title."
part: signals          # one of the ids in src/data/parts.ts
order: 1               # global chapter number; also sets reading order
stub: false            # true shows a "not written yet" notice
---
```

The chapter number, Part label, title, deck, and next-chapter card are all
rendered by the template. The MDX body is the chapter text. Two components are
meant to be imported into chapters:

```mdx
import TryIt from '../../components/TryIt.astro';
import CarryForward from '../../components/CarryForward.astro';

<TryIt title="Light the chain" note="Click the first hill.">
  <beacon-chain></beacon-chain>
</TryIt>

<CarryForward>
  - **A distinction.** ...
</CarryForward>
```

Every chapter page loads `components/interactives/index.js`, so any registered
element can be used in any chapter.

## Adding an interactive

1. Write a class extending `HTMLElement` in `src/components/interactives/`.
   Use a shadow root and import `baseStyles` from `shared.js`; the site
   palette reaches the component through CSS custom properties
   (`--bg`, `--panel`, `--border`, `--text`, `--heading`, `--muted`,
   `--accent`, `--link`).
2. Register it in `interactives/index.js`.
3. Use it in MDX inside a `<TryIt>` panel.

Keep them small, keyboard-reachable, and respectful of
`prefers-reduced-motion`.

## Deployment

Pushes to any branch run the build. Pushes to the repository's default branch
also deploy the result to GitHub Pages. In the repository settings, Pages must
be set to build from **GitHub Actions** (Settings → Pages → Source).

## Design notes

- Palette: background `#0d0a1c`, sidebar `#0b0818`, panels `#110d24`,
  borders `#221c40`, text `#d9d2f0`, headings `#f4f0ff`, muted `#8d84ad`,
  accent `#8b5cf6`, links `#b69cff`. A warm amber is used only for fire.
- Type: Newsreader for body at 20px/1.6, weight 300; Instrument Sans for the
  sidebar, labels, and small caps. Reading column 680px.
- Sidebar navigation with the current Part expanded, a thin progress line, and
  a top drawer on phones. No gradients, no emoji.
