"use client";

import { create } from "zustand";
import type { Form, FormSubmission } from "./types";

interface FormsStore {
  forms: Form[];
  submissions: FormSubmission[];
  selectedFormId: string | null;
  setForms: (forms: Form[]) => void;
  setSubmissions: (submissions: FormSubmission[]) => void;
  setSelectedFormId: (id: string) => void;
  addForm: (form: Form) => void;
  updateForm: (id: string, form: Partial<Form>) => void;
  deleteForm: (id: string) => void;
}

const SEED_FORMS: Form[] = [
  {
    id: "f1",
    name: "Reservation request",
    submissions: 312,
    lastSubmission: "12m ago",
    status: "active",
    fields: [
      { id: "f1_1", label: "Name", type: "text", required: true },
      { id: "f1_2", label: "Email", type: "email", required: true },
      { id: "f1_3", label: "Date", type: "text", required: true },
      { id: "f1_4", label: "Party size", type: "number", required: true },
      {
        id: "f1_5",
        label: "Special requests",
        type: "textarea",
        required: false,
      },
    ],
    submissionDestination: "email",
    successMessage: "Thank you! We'll confirm your reservation within 2 hours.",
  },
  {
    id: "f2",
    name: "Private events inquiry",
    submissions: 88,
    lastSubmission: "2h ago",
    status: "active",
    fields: [
      { id: "f2_1", label: "Name", type: "text", required: true },
      { id: "f2_2", label: "Email", type: "email", required: true },
      { id: "f2_3", label: "Event type", type: "select", required: true },
      { id: "f2_4", label: "Guest count", type: "number", required: true },
    ],
    submissionDestination: "email",
    successMessage: "We'll be in touch soon about your event!",
  },
  {
    id: "f3",
    name: "Press contact",
    submissions: 24,
    lastSubmission: "yesterday",
    status: "active",
    fields: [
      { id: "f3_1", label: "Name", type: "text", required: true },
      { id: "f3_2", label: "Email", type: "email", required: true },
      { id: "f3_3", label: "Publication", type: "text", required: true },
      {
        id: "f3_4",
        label: "Your message",
        type: "textarea",
        required: true,
      },
    ],
    submissionDestination: "email",
    successMessage: "Thank you for reaching out!",
  },
  {
    id: "f4",
    name: "Newsletter",
    submissions: 1402,
    lastSubmission: "4m ago",
    status: "active",
    fields: [{ id: "f4_1", label: "Email", type: "email", required: true }],
    submissionDestination: "webhook",
    successMessage: "Welcome to our newsletter!",
  },
  {
    id: "f5",
    name: "Careers application",
    submissions: 18,
    lastSubmission: "3d ago",
    status: "paused",
    fields: [
      { id: "f5_1", label: "Name", type: "text", required: true },
      { id: "f5_2", label: "Email", type: "email", required: true },
      { id: "f5_3", label: "Position", type: "select", required: true },
      { id: "f5_4", label: "Resume", type: "text", required: true },
    ],
    submissionDestination: "email",
    successMessage: "Thank you for applying!",
  },
];

const SEED_SUBMISSIONS: FormSubmission[] = [
  {
    id: "sb1",
    formId: "f1",
    name: "Olivia Park",
    email: "olivia@…",
    time: "12m ago",
    excerpt: "Party of 4 for our anniversary, hoping for the chef's counter…",
    data: {},
  },
  {
    id: "sb2",
    formId: "f4",
    name: "Marco",
    email: "marco@…",
    time: "23m ago",
    excerpt: "—",
    data: {},
  },
  {
    id: "sb3",
    formId: "f2",
    name: "C. Otieno",
    email: "cotieno@…",
    time: "2h ago",
    excerpt: "Holiday party, ~40 guests, mid-Dec.",
    data: {},
  },
  {
    id: "sb4",
    formId: "f1",
    name: "T. Nakagawa",
    email: "tnakag@…",
    time: "3h ago",
    excerpt: "Tasting menu Sat night, 2 guests.",
    data: {},
  },
  {
    id: "sb5",
    formId: "f3",
    name: "Rosa Beltran",
    email: "rosa@…",
    time: "yesterday",
    excerpt: "Profile piece for Valley Quarterly.",
    data: {},
  },
  {
    id: "sb6",
    formId: "f1",
    name: "J. Park",
    email: "jpark@…",
    time: "yesterday",
    excerpt: "Dietary: gluten-free, party of 3.",
    data: {},
  },
];

export const useFormsStore = create<FormsStore>((set) => ({
  forms: SEED_FORMS,
  submissions: SEED_SUBMISSIONS,
  selectedFormId: "f1",
  setForms: (forms) => set({ forms }),
  setSubmissions: (submissions) => set({ submissions }),
  setSelectedFormId: (id) => set({ selectedFormId: id }),
  addForm: (form) =>
    set((state) => ({
      forms: [form, ...state.forms],
    })),
  updateForm: (id, updates) =>
    set((state) => ({
      forms: state.forms.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),
  deleteForm: (id) =>
    set((state) => ({
      forms: state.forms.filter((f) => f.id !== id),
      selectedFormId:
        state.selectedFormId === id
          ? (state.forms[0]?.id ?? null)
          : state.selectedFormId,
    })),
}));

export const selectForms = (s: FormsStore) => s.forms;
export const selectSubmissions = (s: FormsStore) => s.submissions;
export const selectSelectedFormId = (s: FormsStore) => s.selectedFormId;
export const selectSetSelectedFormId = (s: FormsStore) => s.setSelectedFormId;
