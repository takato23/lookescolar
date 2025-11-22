import { create } from 'zustand';

interface LandingState {
    isOpening: boolean;
    setOpening: (opening: boolean) => void;
}

export const useLandingState = create<LandingState>((set) => ({
    isOpening: false,
    setOpening: (opening) => set({ isOpening: opening }),
}));
