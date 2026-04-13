"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  contactFromJson,
  contactToJson,
} from "../validation";
import { useUpdateSiteConfig } from "../hooks/use-tenant-site";

interface SiteContactFormProps {
  contact: Record<string, unknown> | null;
  disabled?: boolean;
}

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
    <Card>
      <CardHeader>
        <CardTitle>Contact</CardTitle>
        <CardDescription>
          Shown on the contact page and in the site footer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input
              id="contact-phone"
              placeholder="+977 98…"
              disabled={disabled}
              {...form.register("phone")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contact-address">Address</Label>
            <Input
              id="contact-address"
              placeholder="123 Main St, Kathmandu"
              disabled={disabled}
              {...form.register("address")}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
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
          </div>

          <div className="flex items-end justify-end sm:col-span-2">
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
  );
}
