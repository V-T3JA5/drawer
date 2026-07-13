# Drawer — your egd guide

Study/tutorial site for Engineering Graphics and Design. 11 weeks, each with
theory (pre-lab / post-lab / procedure) and a set of questions, each question
a click-by-click step guide.

## ⚠️ Before you do anything: read this

This project was written by Claude in a sandbox **with no internet access**,
so `npm install` / `npm run build` / `npm run dev` were never actually run or
tested here. The code has been written carefully and the content-scanning
logic (`scripts/generate-manifest.mjs`) *was* tested for real against the
placeholder Week 1 content included in this project — but the Next.js build
itself has not been executed. **The first thing you should do is run it
locally and see what happens.** If something doesn't compile, paste the exact
error back into this chat and it'll get fixed — don't assume it's your fault.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:3000. `npm run dev` automatically re-scans your
content folder and regenerates the manifest every time you start it (see
"Adding content" below for why you may need to restart dev after adding
files mid-session).

To build the static site (same thing Vercel will run automatically):

```bash
npm run build
```

Output goes to `/out` — that folder is what actually gets deployed. You
don't need to run this manually if you're deploying via Vercel + GitHub;
Vercel runs it for you on every push.

## How the site is structured

- **Home page** (`/`) — loading animation, hero, 11 week cards (alternating
  image/text layout), a drifting 3D model behind the cards on desktop.
- **Week page** (`/week/1`) — Pre-Lab / Post-Lab / Procedure tabs, plus a
  list of that week's questions.
- **Tutorial page** (`/week/1/question/1`) — step-by-step guide with
  Previous/Next navigation, one image + text block per step.

Weeks that don't have content yet still show up on the home page as a
greyed-out "coming soon" card (not clickable) — the site always shows all 11.

## Adding content (this is the part you'll actually do)

All content lives in `public/content/weekN/`. **You never touch any code to
add content** — just drop correctly-named files in, following this pattern:

```
public/content/week1/
  w1_title.md          → the week's topic name (shown on its card)
  w1_desc.md            → short card description
  w1_cover.jpg           → card image (.jpg/.jpeg/.png/.webp/.svg all work)

  w1_prelab.md  + w1_prelab.jpg       → Pre-Lab tab
  w1_postlab.md + w1_postlab.jpg      → Post-Lab tab
  w1_procedure.md + w1_procedure.jpg  → Procedure tab

  w1_q1_title.md         → Question 1's label
  w1_q1_s1.md + w1_q1_s1.jpg    → Question 1, Step 1
  w1_q1_s2.md + w1_q1_s2.jpg    → Question 1, Step 2
  ...as many steps as that question needs

  w1_q2_title.md         → Question 2's label
  w1_q2_s1.md + w1_q2_s1.jpg
  ...
```

Rules:
- Text files use light markdown: `**bold**`, `- bullet`, `## heading`,
  numbered lists (`1. like this`). Nothing fancier is supported on purpose
  — see `lib/markdown.js` if you ever need more.
- Step numbers can't skip (no jumping `s1` → `s3`). If you do, the build
  will still work, but it'll print a warning telling you exactly which step
  is missing — check your terminal output after running `npm run dev` or
  `npm run build`.
- Image filenames just need the same base name as their `.md` file, any of
  `.jpg` `.jpeg` `.png` `.webp` `.svg`.
- **After adding files, the manifest needs to regenerate.** This happens
  automatically every time you run `npm run dev` or `npm run build` — so if
  you're deploying via GitHub → Vercel, just push and it's automatic. If
  you're running `npm run dev` locally and add files while it's already
  running, restart it (Ctrl+C, then `npm run dev` again) to pick them up.

To add Week 2, 3, etc., just create `public/content/week2/` and so on,
following the exact same naming pattern.

## Adding your real 3D model

Right now the drifting home-page object is a procedural placeholder shape
(built in `components/DriftModel.jsx`) so the site works fully without
waiting on Blender work. When your real model is ready:

1. Export it from Blender as `.glb`, with your shape-shift baked in as
   **shape keys** (these become glTF morph targets on export — that's the
   standard, well-supported way to do this).
2. Name the file `main-model.glb` and place it at `public/models/main-model.glb`.
3. Rebuild. The code already tries to load this exact path first and only
   falls back to the placeholder shape if the file isn't there — so this is
   a drop-in swap, no code changes needed.

Keep it low-poly and avoid physics/particle-based effects in the animation
— vertex/shape-key based morphing exports cleanly and stays light; physics
sims generally don't translate to glTF well and will bloat file size.

## Colors, fonts, spacing

Everything themeable lives at the top of `app/globals.css` under `:root`
— the amber hex values, background shades, header/footer height, etc.
Change values there rather than hunting through individual components.

Fonts (Space Grotesk for headings, Inter for body) are loaded via
`next/font/google` in `app/layout.js` — self-hosted automatically at build
time, no runtime calls to Google's servers.

## Deploying (Vercel + private GitHub repo)

1. Create a **private** GitHub repo, push this project to it. Repo
   visibility is what keeps your code hidden — this is a repo setting, not
   something the framework affects.
2. In Vercel, "Add New Project" → import that repo. Vercel auto-detects
   Next.js; no config changes needed.
3. Set the project name/domain to `drawer-egd` if that subdomain is still
   available (if it's taken, Vercel will suggest an alternative like
   `drawer-egd-yourname`).
4. Every future `git push` automatically triggers a rebuild (~30–60s) and
   redeploys — this is how you'll add new weeks over time.

## Known simplifications (deliberate, not oversights)

- **No `react-markdown` / full markdown library** — a tiny custom parser in
  `lib/markdown.js` handles bold/bullets/headings only, to keep the
  dependency list small. Upgrade this file if you need tables, links, etc.
- **No `@react-three/fiber`** — the 3D model uses plain Three.js directly
  inside one client component, not the React-Three-Fiber abstraction layer.
  For a single scroll-driven object like this, it's fewer dependencies and
  more predictable than adding a whole extra rendering layer on top.
- **No post-processing bloom pass** — the glow is a cheap additive-blended
  sprite, not a full `UnrealBloomPass` pipeline. Much lighter on performance;
  can be upgraded later if you want a more intense glow and don't mind the
  cost.

## If something's broken

Paste the actual error message back into the chat where this was built —
don't guess at fixes yourself first if you're not comfortable with that;
it's faster to just share the error.
