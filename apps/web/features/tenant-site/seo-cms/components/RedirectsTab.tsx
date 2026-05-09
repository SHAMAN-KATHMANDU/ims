"use client";

import { useState } from "react";
import { Plus, Search, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useRedirects,
  useCreateRedirect,
  useDeleteRedirect,
} from "@/features/tenant-site/hooks/use-redirects";
import { useToast } from "@/hooks/useToast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreateRedirectData } from "@/features/tenant-site/services/redirects.service";

const RedirectSchema = z.object({
  fromPath: z.string().min(1, "From path required"),
  toPath: z.string().min(1, "To path required"),
  statusCode: z.enum(["301", "302"]),
  isActive: z.boolean(),
});

type RedirectInput = z.infer<typeof RedirectSchema>;

export function RedirectsTab() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const redirectsQuery = useRedirects();
  const createMutation = useCreateRedirect();
  const deleteMutation = useDeleteRedirect();
  const { toast } = useToast();

  const redirects = redirectsQuery.data ?? [];
  const filtered = redirects.filter(
    (r) => r.fromPath.includes(search) || r.toPath.includes(search),
  );

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search redirects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-1" />
          Import CSV
        </Button>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New redirect
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add redirect</DialogTitle>
              <DialogDescription>
                Create a URL redirect rule. The source path must start with /.
              </DialogDescription>
            </DialogHeader>
            <AddRedirectForm
              onSuccess={() => setAddOpen(false)}
              createMutation={createMutation}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/30 px-4 py-3 grid grid-cols-5 gap-4 text-xs font-mono uppercase tracking-wider text-muted-foreground border-b">
          <div>Code</div>
          <div className="col-span-2">From</div>
          <div className="col-span-2">To</div>
        </div>
        {redirectsQuery.isLoading && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading redirects…
          </div>
        )}
        {!redirectsQuery.isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No redirects found
          </div>
        )}
        {filtered.map((redirect) => (
          <div
            key={redirect.id}
            className="px-4 py-3 border-t grid grid-cols-5 gap-4 items-center text-sm font-mono hover:bg-muted/30 transition-colors"
          >
            <div
              className={`text-xs px-2 py-1 rounded w-fit ${
                redirect.statusCode === 301
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              {redirect.statusCode}
            </div>
            <div className="col-span-2 text-xs break-all">
              {redirect.fromPath}
            </div>
            <div className="col-span-2 text-xs text-muted-foreground break-all">
              {redirect.toPath}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => handleDelete(redirect.id)}
                className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AddRedirectFormProps {
  onSuccess: () => void;
  createMutation: ReturnType<typeof useCreateRedirect>;
}

function AddRedirectForm({ onSuccess, createMutation }: AddRedirectFormProps) {
  const { toast } = useToast();
  const form = useForm<RedirectInput>({
    resolver: zodResolver(RedirectSchema),
    defaultValues: {
      fromPath: "",
      toPath: "",
      statusCode: "301",
      isActive: true,
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    createMutation.mutate(
      {
        fromPath: values.fromPath,
        toPath: values.toPath,
        statusCode: parseInt(values.statusCode) as 301 | 302,
        isActive: values.isActive,
      } as CreateRedirectData,
      {
        onSuccess: () => {
          toast({ title: "Redirect created" });
          onSuccess();
        },
      },
    );
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fromPath">From path</Label>
        <Input
          id="fromPath"
          placeholder="/old-page"
          {...form.register("fromPath")}
        />
        {form.formState.errors.fromPath && (
          <p className="text-xs text-destructive">
            {form.formState.errors.fromPath.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="toPath">To path</Label>
        <Input
          id="toPath"
          placeholder="/new-page"
          {...form.register("toPath")}
        />
        {form.formState.errors.toPath && (
          <p className="text-xs text-destructive">
            {form.formState.errors.toPath.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="statusCode">Status code</Label>
        <Select
          value={form.watch("statusCode")}
          onValueChange={(v) => form.setValue("statusCode", v as "301" | "302")}
        >
          <SelectTrigger id="statusCode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="301">301 (Permanent)</SelectItem>
            <SelectItem value="302">302 (Temporary)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating…" : "Create redirect"}
        </Button>
      </div>
    </form>
  );
}
