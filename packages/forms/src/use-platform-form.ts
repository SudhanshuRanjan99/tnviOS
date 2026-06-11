"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createFormAuditEntry,
  type DraftStatus,
  type DraftStore,
  type FieldAccess,
  type FormAction,
  type FormAuditWriter,
  type FormDefinition,
  type FormValues,
  validateForm,
} from "./core";

export interface PlatformFormOptions<Values extends FormValues> {
  readonly definition: FormDefinition<Values>;
  readonly initialValues: Values;
  readonly fieldPermissions: Readonly<Record<string, FieldAccess>>;
  readonly draftKey?: string;
  readonly draftStore?: DraftStore;
  readonly auditWriter?: FormAuditWriter<Values>;
  readonly onSubmit?: (action: FormAction, values: Values) => Promise<void>;
}

export function usePlatformForm<Values extends FormValues>(options: PlatformFormOptions<Values>) {
  const [values, setValues] = useState(options.initialValues);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("draft");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftVersion, setDraftVersion] = useState(0);
  const baseline = useRef(options.initialValues);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!options.draftKey || !options.draftStore || hydrated.current) return;
    hydrated.current = true;
    void options.draftStore.load<Values>(options.draftKey).then((draft) => {
      if (!draft) return;
      setValues(draft.values);
      setDraftVersion(draft.version);
      baseline.current = draft.values;
      setDraftStatus("auto_saved");
      setIsDirty(false);
    });
  }, [options.draftKey, options.draftStore]);

  const saveDraft = useCallback(async () => {
    if (!options.draftKey || !options.draftStore) return;
    setIsSaving(true);
    const nextVersion = draftVersion + 1;
    try {
      await options.draftStore.save(
        options.draftKey,
        { values, version: nextVersion, savedAt: new Date() },
        draftVersion,
      );
      await options.auditWriter?.write(
        createFormAuditEntry({
          definition: options.definition,
          action: "auto_save",
          before: baseline.current,
          after: values,
          metadata: { draftVersion: nextVersion },
        }),
      );
      baseline.current = values;
      setDraftVersion(nextVersion);
      setDraftStatus("auto_saved");
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    draftVersion,
    options.auditWriter,
    options.definition,
    options.draftKey,
    options.draftStore,
    values,
  ]);

  useEffect(() => {
    if (!options.definition.autoSave?.enabled || !hydrated.current || !isDirty) return;
    const timer = window.setTimeout(
      () => void saveDraft(),
      options.definition.autoSave.debounceMs ?? 1000,
    );
    return () => window.clearTimeout(timer);
  }, [isDirty, options.definition.autoSave, saveDraft, values]);

  const setValue = useCallback(
    <Field extends Extract<keyof Values, string>>(field: Field, value: Values[Field]) => {
      if (options.fieldPermissions[field] !== "editable") return;
      setValues((current) => ({ ...current, [field]: value }));
      setDraftStatus("draft");
      setIsDirty(true);
      setErrors((current) =>
        Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)),
      );
    },
    [options.fieldPermissions],
  );

  const submit = useCallback(
    async (action: FormAction) => {
      const result = validateForm(options.definition, values);
      setErrors(result.errors);
      if (!result.data) return false;
      setIsSubmitting(true);
      try {
        await options.onSubmit?.(action, result.data);
        await options.auditWriter?.write(
          createFormAuditEntry({
            definition: options.definition,
            action,
            before: baseline.current,
            after: result.data,
          }),
        );
        baseline.current = result.data;
        setIsDirty(false);
        setDraftStatus(action === "submit_for_approval" ? "pending_approval" : "submitted");
        if (options.draftKey) await options.draftStore?.remove(options.draftKey);
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      options.auditWriter,
      options.definition,
      options.draftKey,
      options.draftStore,
      options.onSubmit,
      values,
    ],
  );

  return {
    draftStatus,
    errors,
    fieldAccess: options.fieldPermissions,
    isSaving,
    isSubmitting,
    isDirty,
    saveDraft,
    setValue,
    submit,
    values,
  } as const;
}
