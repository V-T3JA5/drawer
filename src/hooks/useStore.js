import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── App state
  isLoading: true,
  introComplete: false,
  activeWeek: null,
  scrollProgress: 0,
  scrollVelocity: 0,

  // ── Cursor state
  cursorPos: { x: 0, y: 0 },
  cursorHovered: false,
  cursorClicked: false,

  // ── Helix state
  helixRotation: 0,
  currentHelixNode: 0,

  // ── Week tutorial state
  currentStep: 0,
  completedSteps: [],

  // ── Actions
  setLoading: (v) => set({ isLoading: v }),
  setIntroComplete: () => set({ introComplete: true }),
  setActiveWeek: (week) => set({ activeWeek: week }),
  setScrollProgress: (p) => set({ scrollProgress: p }),
  setScrollVelocity: (v) => set({ scrollVelocity: v }),
  setCursorPos: (pos) => set({ cursorPos: pos }),
  setCursorHovered: (v) => set({ cursorHovered: v }),
  setCursorClicked: (v) => set({ cursorClicked: v }),
  setHelixRotation: (r) => set({ helixRotation: r }),
  setCurrentHelixNode: (n) => set({ currentHelixNode: n }),
  setCurrentStep: (s) => set({ currentStep: s }),
  completeStep: (s) => set((state) => ({
    completedSteps: [...new Set([...state.completedSteps, s])]
  })),
  resetWeek: () => set({ currentStep: 0, completedSteps: [] }),
}))
