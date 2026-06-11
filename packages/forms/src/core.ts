import type { z } from "zod";

export type FormValues = Record<string, unknown>;
export type FormMode = "create" | "edit" | "view";
export type FormAction =
  | "save"
  | "submit"
  | "submit_for_approval"
  | "approve"
  | "reject"
  | "request_changes";
export type DraftStatus = "draft" | "auto_saved" | "submitted" | "pending_approval";
export type FieldAccess = "editable" | "read_only" | "hidden" | "masked";

export interface FormFieldDefinition<Values extends FormValues> {
  readonly name: Extract<keyof Values, string>;
  readonly label: string;
  readonly type: "text" | "email" | "phone" | "number" | "textarea" | "select";
  readonly required?: boolean;
  readonly options?: readonly { readonly label: string; readonly value: string }[];
}

export interface FormDefinition<Values extends FormValues> {
  readonly key: string;
  readonly module: string;
  readonly entity: string;
  readonly mode: FormMode;
  readonly schema: z.ZodType<Values>;
  readonly fields: readonly FormFieldDefinition<Values>[];
  readonly permissions?: Readonly<Record<string, string>>;
  readonly autoSave?: { readonly enabled: boolean; readonly debounceMs?: number };
  readonly workflow?: { readonly required: boolean; readonly submitAction?: FormAction };
}

export interface FormAuditEntry<Values extends FormValues> {
  readonly formKey: string;
  readonly entityType: string;
  readonly action: FormAction | "auto_save";
  readonly changedFields: readonly Extract<keyof Values, string>[];
  readonly oldValues: Partial<Values>;
  readonly newValues: Partial<Values>;
  readonly occurredAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface FormAuditWriter<Values extends FormValues> {
  write(entry: FormAuditEntry<Values>): Promise<void>;
}

export interface DraftRecord<Values extends FormValues> {
  readonly values: Values;
  readonly version: number;
  readonly savedAt: Date;
}

export interface DraftStore {
  load<Values extends FormValues>(key: string): Promise<DraftRecord<Values> | null>;
  save<Values extends FormValues>(
    key: string,
    draft: DraftRecord<Values>,
    expectedVersion: number,
  ): Promise<void>;
  remove(key: string): Promise<void>;
}

export class DraftConflictError extends Error {
  constructor() {
    super("The draft changed in another session. Reload before saving again.");
    this.name = "DraftConflictError";
  }
}

export function defineForm<Values extends FormValues>(
  definition: FormDefinition<Values>,
): FormDefinition<Values> {
  if (!/^[a-z][a-z0-9_.-]+$/.test(definition.key)) {
    throw new Error("Form key must be a namespaced lowercase key.");
  }
  return definition;
}

export function resolveFieldAccess(
  field: string,
  permissions: Readonly<Record<string, FieldAccess>>,
): FieldAccess {
  return permissions[field] ?? "hidden";
}

export function validateForm<Values extends FormValues>(
  definition: FormDefinition<Values>,
  values: Values,
): { readonly data?: Values; readonly errors: Readonly<Record<string, string>> } {
  const result = definition.schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };
  return {
    errors: Object.fromEntries(
      result.error.issues.map((issue) => [String(issue.path[0] ?? "_form"), issue.message]),
    ),
  };
}

export function createFormAuditEntry<Values extends FormValues>(input: {
  readonly definition: FormDefinition<Values>;
  readonly action: FormAuditEntry<Values>["action"];
  readonly before: Values;
  readonly after: Values;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly occurredAt?: Date;
}): FormAuditEntry<Values> {
  const changedFields = (Object.keys(input.after) as Extract<keyof Values, string>[]).filter(
    (field) => !Object.is(input.before[field], input.after[field]),
  );
  return {
    formKey: input.definition.key,
    entityType: input.definition.entity,
    action: input.action,
    changedFields,
    oldValues: pick(input.before, changedFields),
    newValues: pick(input.after, changedFields),
    occurredAt: input.occurredAt ?? new Date(),
    metadata: input.metadata ?? {},
  };
}

export class MemoryDraftStore implements DraftStore {
  private readonly drafts = new Map<string, DraftRecord<FormValues>>();

  async load<Values extends FormValues>(key: string): Promise<DraftRecord<Values> | null> {
    return (this.drafts.get(key) as DraftRecord<Values> | undefined) ?? null;
  }

  async save<Values extends FormValues>(
    key: string,
    draft: DraftRecord<Values>,
    expectedVersion: number,
  ): Promise<void> {
    const current = this.drafts.get(key);
    if ((current?.version ?? 0) !== expectedVersion) throw new DraftConflictError();
    this.drafts.set(key, draft);
  }

  async remove(key: string): Promise<void> {
    this.drafts.delete(key);
  }
}

export class BrowserDraftStore implements DraftStore {
  constructor(private readonly prefix = "tnvios:draft:") {}

  async load<Values extends FormValues>(key: string): Promise<DraftRecord<Values> | null> {
    if (typeof window === "undefined") return null;
    const serialized = window.localStorage.getItem(this.prefix + key);
    if (!serialized) return null;
    const draft = JSON.parse(serialized) as Omit<DraftRecord<Values>, "savedAt"> & {
      readonly savedAt: string;
    };
    return { ...draft, savedAt: new Date(draft.savedAt) };
  }

  async save<Values extends FormValues>(
    key: string,
    draft: DraftRecord<Values>,
    expectedVersion: number,
  ): Promise<void> {
    if (typeof window === "undefined") return;
    const current = await this.load<Values>(key);
    if ((current?.version ?? 0) !== expectedVersion) throw new DraftConflictError();
    window.localStorage.setItem(this.prefix + key, JSON.stringify(draft));
  }

  async remove(key: string): Promise<void> {
    if (typeof window !== "undefined") window.localStorage.removeItem(this.prefix + key);
  }
}

function pick<Values extends FormValues>(
  values: Values,
  fields: readonly Extract<keyof Values, string>[],
): Partial<Values> {
  const selected: Partial<Values> = {};
  for (const field of fields) selected[field] = values[field];
  return selected;
}
