"use client";

import { Check, Cloud, CloudUpload, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, Button, Card, Label } from "./primitives";

export function FormField({
  children,
  description,
  error,
  label,
  required,
}: {
  readonly children: ReactNode;
  readonly description?: string;
  readonly error?: string;
  readonly label: string;
  readonly required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : (
        description && <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function FieldPermissionGuard({
  access,
  children,
  maskedValue = "Restricted",
}: {
  readonly access: "editable" | "read_only" | "hidden" | "masked";
  readonly children: ReactNode;
  readonly maskedValue?: string;
}) {
  if (access === "hidden") return null;
  if (access === "masked")
    return (
      <div className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-border bg-muted px-3 text-sm text-muted-foreground">
        <LockKeyhole className="size-4" />
        {maskedValue}
      </div>
    );
  return children;
}

export function AutoSaveIndicator({
  isSaving,
  status,
}: {
  readonly isSaving: boolean;
  readonly status: "draft" | "auto_saved" | "submitted" | "pending_approval";
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground" role="status">
      {isSaving ? <CloudUpload className="size-4" /> : <Cloud className="size-4" />}
      {isSaving ? "Saving draft..." : status === "auto_saved" ? "Draft saved" : "Unsaved changes"}
    </span>
  );
}

export function DraftStatus({ status }: { readonly status: string }) {
  return <Badge>{status.replaceAll("_", " ")}</Badge>;
}

export function WorkflowSubmitBar({
  isSubmitting,
  onSave,
  onSubmit,
  status,
}: {
  readonly isSubmitting: boolean;
  readonly onSave: () => void;
  readonly onSubmit: () => void;
  readonly status: string;
}) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
          <Check className="size-4" />
        </span>
        <span>
          <strong className="block">Workflow-aware submission</strong>
          <span className="text-xs text-muted-foreground">Current state: {status}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Button disabled={isSubmitting} onClick={onSave} type="button" variant="outline">
          Save draft
        </Button>
        <Button disabled={isSubmitting} onClick={onSubmit} type="button">
          {isSubmitting ? "Submitting..." : "Submit for approval"}
        </Button>
      </div>
    </Card>
  );
}
