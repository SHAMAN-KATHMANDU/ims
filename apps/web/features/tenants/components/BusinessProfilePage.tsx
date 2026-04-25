"use client";

/**
 * Business Profile settings page.
 *
 * Renders 7 Card sections (Identity, Logo & Favicon, Contact, Address, Tax IDs,
 * Defaults, Socials) with React Hook Form + Zod validation, a sticky save bar
 * showing the dirty-field count, and a beforeunload guard while changes are pending.
 *
 * Self-gated by PermissionGate perm="SETTINGS.TENANT.VIEW".
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionGate } from "@/features/permissions";
import { MediaPickerField } from "@/features/media";
import { useToast } from "@/hooks/useToast";

import {
  useMyBusinessProfile,
  useUpdateMyBusinessProfile,
} from "../hooks/use-business-profile";
import type { BusinessProfile, UpdateBusinessProfileData } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema
// ─────────────────────────────────────────────────────────────────────────────

/** A string field that validates as a URL only when non-empty. */
const optionalUrl = z.string().superRefine((val, ctx) => {
  if (val === "") return;
  try {
    new URL(val);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid URL (e.g. https://example.com)",
    });
  }
});

/** A string field that validates as an email only when non-empty. */
const optionalEmail = z.string().superRefine((val, ctx) => {
  if (val === "") return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a valid email address",
    });
  }
});

const BusinessProfileFormSchema = z.object({
  // ── Identity ───────────────────────────────────────────────────────────────
  legalName: z.string().max(255),
  displayName: z.string().max(255),
  tagline: z.string().max(500),
  // ── Media ──────────────────────────────────────────────────────────────────
  logoUrl: z.string(),
  faviconUrl: z.string(),
  // ── Contact ────────────────────────────────────────────────────────────────
  email: optionalEmail,
  phone: z.string().max(30),
  alternatePhone: z.string().max(30),
  websiteUrl: optionalUrl,
  // ── Address ────────────────────────────────────────────────────────────────
  addressLine1: z.string().max(255),
  addressLine2: z.string().max(255),
  city: z.string().max(100),
  state: z.string().max(100),
  postalCode: z.string().max(20),
  country: z.string().max(2),
  mapUrl: optionalUrl,
  // ── Tax IDs ────────────────────────────────────────────────────────────────
  panNumber: z.string().max(50),
  vatNumber: z.string().max(50),
  registrationNumber: z.string().max(50),
  taxId: z.string().max(50),
  // ── Defaults ───────────────────────────────────────────────────────────────
  defaultCurrency: z.string().max(3),
  timezone: z.string().max(100),
  // ── Socials ────────────────────────────────────────────────────────────────
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  xUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  linkedinUrl: optionalUrl,
});

type BusinessProfileFormValues = z.infer<typeof BusinessProfileFormSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM: BusinessProfileFormValues = {
  legalName: "",
  displayName: "",
  tagline: "",
  logoUrl: "",
  faviconUrl: "",
  email: "",
  phone: "",
  alternatePhone: "",
  websiteUrl: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  mapUrl: "",
  panNumber: "",
  vatNumber: "",
  registrationNumber: "",
  taxId: "",
  defaultCurrency: "",
  timezone: "",
  facebookUrl: "",
  instagramUrl: "",
  xUrl: "",
  tiktokUrl: "",
  linkedinUrl: "",
};

function profileToFormValues(
  p?: BusinessProfile | null,
): BusinessProfileFormValues {
  if (!p) return EMPTY_FORM;
  return {
    legalName: p.legalName ?? "",
    displayName: p.displayName ?? "",
    tagline: p.tagline ?? "",
    logoUrl: p.logoUrl ?? "",
    faviconUrl: p.faviconUrl ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    alternatePhone: p.alternatePhone ?? "",
    websiteUrl: p.websiteUrl ?? "",
    addressLine1: p.addressLine1 ?? "",
    addressLine2: p.addressLine2 ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    postalCode: p.postalCode ?? "",
    country: p.country ?? "",
    mapUrl: p.mapUrl ?? "",
    panNumber: p.panNumber ?? "",
    vatNumber: p.vatNumber ?? "",
    registrationNumber: p.registrationNumber ?? "",
    taxId: p.taxId ?? "",
    defaultCurrency: p.defaultCurrency ?? "",
    timezone: p.timezone ?? "",
    facebookUrl: p.socials?.facebook ?? "",
    instagramUrl: p.socials?.instagram ?? "",
    xUrl: p.socials?.x ?? "",
    tiktokUrl: p.socials?.tiktok ?? "",
    linkedinUrl: p.socials?.linkedin ?? "",
  };
}

function formValuesToPayload(
  v: BusinessProfileFormValues,
): UpdateBusinessProfileData {
  return {
    legalName: v.legalName || null,
    displayName: v.displayName || null,
    tagline: v.tagline || null,
    logoUrl: v.logoUrl || null,
    faviconUrl: v.faviconUrl || null,
    email: v.email || null,
    phone: v.phone || null,
    alternatePhone: v.alternatePhone || null,
    websiteUrl: v.websiteUrl || null,
    addressLine1: v.addressLine1 || null,
    addressLine2: v.addressLine2 || null,
    city: v.city || null,
    state: v.state || null,
    postalCode: v.postalCode || null,
    country: v.country || null,
    mapUrl: v.mapUrl || null,
    panNumber: v.panNumber || null,
    vatNumber: v.vatNumber || null,
    registrationNumber: v.registrationNumber || null,
    taxId: v.taxId || null,
    defaultCurrency: v.defaultCurrency || null,
    timezone: v.timezone || null,
    socials: {
      facebook: v.facebookUrl || null,
      instagram: v.instagramUrl || null,
      x: v.xUrl || null,
      tiktok: v.tiktokUrl || null,
      linkedin: v.linkedinUrl || null,
    },
  };
}

function countDirtyFields(df: Record<string, unknown>): number {
  let count = 0;
  for (const val of Object.values(df)) {
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      count += countDirtyFields(val as Record<string, unknown>);
    } else if (val === true) {
      count++;
    }
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function BusinessProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Country & timezone options
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_OPTIONS = [
  { value: "NP", label: "Nepal" },
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
];

const CURRENCY_OPTIONS = [
  { value: "NPR", label: "NPR — Nepalese Rupee" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AED", label: "AED — UAE Dirham" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kathmandu", label: "Asia/Kathmandu (NPT +5:45)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST +5:30)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST +4:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT +8:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST +9:00)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST +8:00)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (ICT +7:00)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (BST +6:00)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET +1:00)" },
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Chicago", label: "America/Chicago (CT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "UTC", label: "UTC" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export function BusinessProfilePage() {
  return (
    <PermissionGate perm="SETTINGS.TENANT.VIEW">
      <BusinessProfilePageInner />
    </PermissionGate>
  );
}

function BusinessProfilePageInner() {
  const { data, isLoading } = useMyBusinessProfile();
  const updateMutation = useUpdateMyBusinessProfile();
  const { toast } = useToast();

  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(BusinessProfileFormSchema),
    defaultValues: EMPTY_FORM,
  });

  const { reset } = form;

  // Populate form once the profile loads (or re-loads after save).
  useEffect(() => {
    if (data?.profile) {
      reset(profileToFormValues(data.profile));
    }
  }, [data?.profile, reset]);

  const isDirty = form.formState.isDirty;
  const dirtyCount = countDirtyFields(
    form.formState.dirtyFields as Record<string, unknown>,
  );

  // Warn browser on navigate-away with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await updateMutation.mutateAsync(
        formValuesToPayload(values),
      );
      toast({ title: "Business profile saved" });
      // Reset dirty state to saved values.
      reset(profileToFormValues(result.profile));
    } catch (err) {
      // onError toast is handled by the mutation hook; catch here prevents
      // unhandled-rejection noise.
    }
  });

  const handleCancel = () => {
    reset(profileToFormValues(data?.profile));
  };

  if (isLoading) return <BusinessProfileSkeleton />;

  const isPending = updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold">Business profile</h1>
        <p className="text-sm text-muted-foreground">
          Logo, contact details, address, and tax IDs — used on receipts,
          invoices, and the storefront.
        </p>
      </div>

      <Form {...form}>
        {/* Padding-bottom so content is not hidden behind the sticky bar */}
        <form onSubmit={onSubmit} className="space-y-6 pb-24">
          {/* ── 1. Identity ──────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Acme Pvt. Ltd." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Acme Store" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Quality you can trust"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── 2. Logo & Favicon ─────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Logo &amp; favicon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo</FormLabel>
                    <FormControl>
                      <MediaPickerField
                        id={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        previewSize={80}
                        helperText="Recommended: 200×200 px, PNG or SVG."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="faviconUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Favicon</FormLabel>
                    <FormControl>
                      <MediaPickerField
                        id={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        accept="image/x-icon,image/png,image/svg+xml"
                        previewSize={48}
                        helperText="Recommended: 32×32 px, ICO or PNG."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── 3. Contact ────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder="hello@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="+977 9800000000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="alternatePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternate phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="+977 9800000001"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── 4. Address ────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address line 1</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="address-line1"
                        placeholder="Street address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address line 2</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="address-line2"
                        placeholder="Apartment, suite, unit, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="address-level2"
                          placeholder="Kathmandu"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="address-level1"
                          placeholder="Bagmati"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete="postal-code"
                          placeholder="44600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="mapUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Map URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://maps.google.com/?q=…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── 5. Tax IDs ────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Tax IDs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="panNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PAN number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 123456789" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 123456789" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. REG-1234" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. TAX-1234" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── 6. Defaults ───────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="defaultCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── 7. Socials ────────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Social links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="facebookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://facebook.com/yourpage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instagramUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://instagram.com/yourhandle"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="xUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>X (Twitter)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://x.com/yourhandle"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tiktokUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://tiktok.com/@yourhandle"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://linkedin.com/company/yourcompany"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* ── Sticky save bar ──────────────────────────────────────────────── */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-background px-4 py-3 shadow-sm">
        <span className="mr-auto text-sm text-muted-foreground">
          {dirtyCount > 0
            ? `${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"}`
            : "No changes"}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={!isDirty || isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="business-profile-form"
          disabled={!isDirty || isPending}
          onClick={onSubmit}
        >
          {isPending
            ? "Saving…"
            : `Save changes${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
        </Button>
      </div>
    </div>
  );
}
