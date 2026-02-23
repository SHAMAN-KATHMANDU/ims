"use client";

import { useState, useEffect } from "react";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  type Member,
  type CreateMemberData,
  type UpdateMemberData,
} from "@/hooks/useMember";
import { Plus, Loader2 } from "lucide-react";
import { FormSurface } from "@/components/ui/form-surface";

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
  onSubmit: (data: CreateMemberData | UpdateMemberData) => Promise<void>;
  isLoading?: boolean;
  /** When true, render form only (no Dialog/trigger). For use on dedicated pages (e.g. mobile). */
  inline?: boolean;
}

export function MemberForm({
  open,
  onOpenChange,
  member,
  onSubmit,
  isLoading,
  inline = false,
}: MemberFormProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [birthday, setBirthday] = useState("");
  const [memberStatus, setMemberStatus] = useState<
    "" | "ACTIVE" | "INACTIVE" | "PROSPECT" | "VIP"
  >("ACTIVE");

  const isEdit = !!member;

  // Reset form when dialog opens/closes or member changes
  useEffect(() => {
    if (open && member) {
      setPhone(member.phone);
      setName(member.name || "");
      setEmail(member.email || "");
      setNotes(member.notes || "");
      setIsActive(member.isActive);
      setGender(member.gender || "");
      setAge(
        member.age !== undefined && member.age !== null
          ? String(member.age)
          : "",
      );
      setAddress(member.address || "");
      setBirthday(member.birthday ? member.birthday.slice(0, 10) : "");
      setMemberStatus(member.memberStatus || "ACTIVE");
    } else if (!open) {
      setPhone("");
      setName("");
      setEmail("");
      setNotes("");
      setIsActive(true);
      setGender("");
      setAge("");
      setAddress("");
      setBirthday("");
      setMemberStatus("ACTIVE");
    }
  }, [open, member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) return;

    const commonData = {
      phone: phone.trim(),
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      gender: gender.trim() || undefined,
      age: age ? Number(age) : undefined,
      address: address.trim() || undefined,
      birthday: birthday || undefined,
    };

    if (isEdit) {
      await onSubmit({
        ...commonData,
        isActive,
        memberStatus: memberStatus || undefined,
      });
    } else {
      await onSubmit({
        ...commonData,
      });
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit}>
      {!inline && (
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Member" : "Add New Member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update member information."
              : "Register a new member with their phone number."}
          </DialogDescription>
        </DialogHeader>
      )}
      {inline && (
        <div className="space-y-1 mb-4">
          <h2 className="text-2xl font-semibold">
            {isEdit ? "Edit Member" : "Add New Member"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isEdit
              ? "Update member information."
              : "Register a new member with their phone number."}
          </p>
        </div>
      )}

      <div className="space-y-4 py-4">
        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., 9841234567"
            required
          />
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer name (optional)"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address (optional)"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
          />
        </div>

        {/* Gender & Age */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Input
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="e.g. Male, Female, Other"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min="0"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age in years"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Customer address"
            rows={2}
          />
        </div>

        {/* Birthday */}
        <div className="space-y-2">
          <Label htmlFor="birthday">Birthday</Label>
          <Input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </div>

        {/* Active Status (only for edit) */}
        {isEdit && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active Status</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberStatus">Member Status</Label>
              <select
                id="memberStatus"
                aria-label="Member status"
                className="border rounded-md px-3 py-2 text-sm w-full bg-background"
                value={memberStatus}
                onChange={(e) =>
                  setMemberStatus(
                    e.target.value as
                      | ""
                      | "ACTIVE"
                      | "INACTIVE"
                      | "PROSPECT"
                      | "VIP",
                  )
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PROSPECT">Prospect</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !phone.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update Member"
          ) : (
            "Add Member"
          )}
        </Button>
      </DialogFooter>
    </form>
  );

  if (inline) {
    return <div className="max-w-lg">{formContent}</div>;
  }

  return (
    <FormSurface
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Member" : "Add New Member"}
      description={
        isEdit
          ? "Update member information."
          : "Register a new member with their phone number."
      }
      renderTrigger={!isEdit}
      trigger={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      }
      drawerClassName="sm:max-w-lg"
    >
      {formContent}
    </FormSurface>
  );
}
