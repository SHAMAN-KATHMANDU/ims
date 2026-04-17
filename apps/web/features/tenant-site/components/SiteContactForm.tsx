"use client";

/**
 * Contact form — tenant contact info used in the site footer and on the
 * contact page. Paired with a live footer-style preview so the tenant can
 * see exactly how the fields render in the rendered site without having
 * to save + refresh the preview iframe.
 */

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import {
  ContactFormSchema,
  type ContactFormInput,
  SOCIAL_KEYS,
  type SocialKey,
  contactFromJson,
  contactToJson,
} from "../validation";
import { useUpdateSiteConfig } from "../hooks/use-tenant-site";

interface SiteContactFormProps {
  contact: Record<string, unknown> | null;
  disabled?: boolean;
}

const SOCIAL_LABELS: Record<SocialKey, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
};

const SOCIAL_PLACEHOLDERS: Record<SocialKey, string> = {
  facebook: "https://facebook.com/acme",
  instagram: "https://instagram.com/acme",
  tiktok: "https://tiktok.com/@acme",
  youtube: "https://youtube.com/@acme",
  whatsapp: "https://wa.me/9779800000000",
  x: "https://x.com/acme",
  linkedin: "https://linkedin.com/company/acme",
};

export function SiteContactForm({ contact, disabled }: SiteContactFormProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateSiteConfig();

  const form = useForm<ContactFormInput>({
    resolver: zodResolver(ContactFormSchema),
    mode: "onBlur",
    defaultValues: contactFromJson(contact),
  });

  useEffect(() => {
    form.reset(contactFromJson(contact));
  }, [contact, form]);

  const watched = useWatch({ control: form.control });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({ contact: contactToJson(values) });
      toast({ title: "Contact info saved" });
    } catch (error) {
      toast({
        title: "Save failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
          <CardDescription>
            Shown on the contact page and in the site footer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="hello@acme.com"
                disabled={disabled}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                placeholder="+977 98…"
                disabled={disabled}
                {...form.register("phone")}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="contact-address">Address</Label>
              <Input
                id="contact-address"
                placeholder="123 Main St, Kathmandu"
                disabled={disabled}
                {...form.register("address")}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="contact-map">Map URL</Label>
              <Input
                id="contact-map"
                placeholder="https://maps.google.com/…"
                disabled={disabled}
                {...form.register("mapUrl")}
              />
              {form.formState.errors.mapUrl && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.mapUrl.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Optional — adds a &ldquo;Get directions&rdquo; link to the
                contact block.
              </p>
            </div>

            <div className="sm:col-span-2">
              <div className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Social links
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {SOCIAL_KEYS.map((key) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`contact-${key}`}>
                      {SOCIAL_LABELS[key]}
                    </Label>
                    <Input
                      id={`contact-${key}`}
                      placeholder={SOCIAL_PLACEHOLDERS[key]}
                      disabled={disabled}
                      {...form.register(key)}
                    />
                    {form.formState.errors[key] && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors[key]?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-end justify-end border-t border-border pt-4 sm:col-span-2">
              <Button
                type="submit"
                disabled={disabled || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving…" : "Save contact"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer preview</CardTitle>
          <CardDescription>
            How your contact info will render in the site footer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactPreview
            email={watched.email ?? ""}
            phone={watched.phone ?? ""}
            address={watched.address ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ContactPreview({
  email,
  phone,
  address,
}: {
  email: string;
  phone: string;
  address: string;
}) {
  const hasAny = email.trim() || phone.trim() || address.trim();
  if (!hasAny) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Add an email, phone, or address above to see a preview.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-muted/30 p-6">
      <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Contact
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        {email.trim() && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <a
              href={`mailto:${email}`}
              className="text-foreground hover:underline"
            >
              {email}
            </a>
          </div>
        )}
        {phone.trim() && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <a
              href={`tel:${phone}`}
              className="text-foreground hover:underline"
            >
              {phone}
            </a>
          </div>
        )}
        {address.trim() && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="text-foreground">{address}</span>
          </div>
        )}
      </div>
    </div>
  );
}
