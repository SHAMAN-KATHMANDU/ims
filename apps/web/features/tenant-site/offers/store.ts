"use client";

import { create } from "zustand";
import type { Offer } from "./types";

interface OffersStore {
  offers: Offer[];
  setOffers: (offers: Offer[]) => void;
  addOffer: (offer: Offer) => void;
  updateOffer: (id: string, offer: Partial<Offer>) => void;
  deleteOffer: (id: string) => void;
}

const SEED_OFFERS: Offer[] = [
  {
    id: "o1",
    code: "FALL14",
    title: "Fall tasting menu launch",
    type: "Event",
    value: "Tasting menu seats",
    uses: 47,
    cap: 80,
    status: "scheduled",
    window: "Nov 14 → Nov 21",
    appliesToAll: false,
    appliesTo: ["tasting-menu"],
  },
  {
    id: "o2",
    code: "FRIENDS",
    title: "Friends & family soft open",
    type: "Comp",
    value: "100% off",
    uses: 22,
    cap: 30,
    status: "active",
    window: "Active now",
    appliesToAll: true,
  },
  {
    id: "o3",
    code: "RESYNYC",
    title: "NYT Critic's pick promo",
    type: "Discount",
    value: "Complimentary amuse",
    uses: 312,
    cap: null,
    status: "active",
    window: "Through Jan 1",
    appliesToAll: false,
    appliesTo: ["amuse"],
  },
  {
    id: "o4",
    code: "CORK20",
    title: "Sommelier wine flight",
    type: "Discount",
    value: "20% off pairings",
    uses: 84,
    cap: 200,
    status: "active",
    window: "Mon–Wed only",
    appliesToAll: false,
    appliesTo: ["wine"],
  },
  {
    id: "o5",
    code: "VALENTINES",
    title: "Valentine's prix fixe",
    type: "Event",
    value: "$165 / person",
    uses: 0,
    cap: 60,
    status: "draft",
    window: "Feb 14, 2027",
    appliesToAll: false,
    appliesTo: ["prix-fixe"],
  },
];

export const useOffersStore = create<OffersStore>((set) => ({
  offers: SEED_OFFERS,
  setOffers: (offers) => set({ offers }),
  addOffer: (offer) =>
    set((state) => ({
      offers: [offer, ...state.offers],
    })),
  updateOffer: (id, updates) =>
    set((state) => ({
      offers: state.offers.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    })),
  deleteOffer: (id) =>
    set((state) => ({
      offers: state.offers.filter((o) => o.id !== id),
    })),
}));

export const selectOffers = (s: OffersStore) => s.offers;
export const selectAddOffer = (s: OffersStore) => s.addOffer;
export const selectUpdateOffer = (s: OffersStore) => s.updateOffer;
export const selectDeleteOffer = (s: OffersStore) => s.deleteOffer;
