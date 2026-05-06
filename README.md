# DRAWER

> The Ultimate AutoCAD Learning Experience — by TJ

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Build & Deploy

```bash
npm run build       # Output to /dist
# Push to GitHub → Vercel auto-deploys
```

## Session Roadmap

| Session | Goal | Status |
|---------|------|--------|
| S1 | Planning + Master Plan | ✅ Done |
| S2 | Project scaffold | ✅ Done |
| S3 | Opening sequence — TJ → DRAWER particles | ⏳ Next |
| S4 | Helix + scroll interaction polish | |
| S5 | Card click Lusion-zoom transition | |
| S6 | Global effects polish (cursor trails, velocity) | |
| S7 | Tutorial page content (Week 1) | |
| S8+ | All weeks content | |
| Final | Polish, perf, mobile, deploy | |

## Stack

- React 18 + Vite 5
- Three.js + React Three Fiber + Drei
- GSAP + ScrollTrigger
- Framer Motion
- Locomotive Scroll
- Tailwind CSS
- Space Grotesk + Space Mono fonts
- Zustand (state)
- React Router v6
- Vercel deploy

## Architecture

```
src/
├── components/
│   ├── cursor/       CustomCursor
│   ├── watermark/    TJWatermark
│   ├── particles/    ParticleAmbience
│   ├── helix/        HelixScene (R3F)
│   ├── cards/        WeekCard
│   ├── tutorial/     StepCard, ProgressBar
│   └── effects/      BlueprintGrid, Scanlines, ClickRipple
├── pages/
│   ├── Landing.jsx   / — helix + intro
│   └── WeekPage.jsx  /week/:id
├── hooks/
│   ├── useStore.js   Zustand global store
│   └── useScroll.js  Scroll tracker
├── data/
│   └── weeks.js      11 weeks + steps
└── utils/
    └── glitch.js     Glitch text hook
```
