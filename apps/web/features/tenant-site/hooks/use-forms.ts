import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import { formsService } from "../services/forms.service";
import type { CreateFormData, UpdateFormData } from "../services/forms.service";

const formKeys = {
  all: ["forms"] as const,
  lists: () => [...formKeys.all, "list"] as const,
  list: () => formKeys.lists(),
  details: () => [...formKeys.all, "detail"] as const,
  detail: (id: string) => [...formKeys.details(), id] as const,
  submissions: (formId: string) =>
    [...formKeys.all, "submissions", formId] as const,
};

export function useFormsQuery() {
  return useQuery({
    queryKey: formKeys.list(),
    queryFn: () => formsService.listForms(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useFormQuery(id: string) {
  return useQuery({
    queryKey: formKeys.detail(id),
    queryFn: () => formsService.getForm(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateFormData) => formsService.createForm(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.lists() });
      toast({ title: "Form created successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to create form",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFormData }) =>
      formsService.updateForm(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: formKeys.lists() });
      queryClient.setQueryData(formKeys.detail(data.form.id), data);
      toast({ title: "Form updated successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to update form",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => formsService.deleteForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.lists() });
      toast({ title: "Form deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete form",
        variant: "destructive",
      });
    },
  });
}

export function useFormSubmissionsQuery(
  formId: string,
  limit: number = 20,
  offset: number = 0,
) {
  return useQuery({
    queryKey: formKeys.submissions(formId),
    queryFn: () => formsService.listFormSubmissions(formId, limit, offset),
    enabled: !!formId,
    staleTime: 30 * 1000,
  });
}
