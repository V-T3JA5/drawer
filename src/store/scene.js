// src/store/scene.js
// Zustand global scene state — shared between R3F canvas and UI.
//
// openingDone: set true by HelixScene when the TJ→DRAWER sequence completes.
//              Home.jsx watches this to unlock scroll and reveal helix content (S5).
//
// S5 will add: activeWeek, scrollProgress, helixRotation.

import { create } from 'zustand'

const useSceneStore = create((set) => ({
  openingDone: false,
  setOpeningDone: (val) => set({ openingDone: val }),
}))

export default useSceneStore
