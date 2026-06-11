import type { EntityId } from "@tnvios/database/identifiers";
import type { JobQueue } from "@tnvios/jobs";

import { key, type ServiceContext } from "./contracts.js";

export interface DataExchangeTemplate {
  readonly key: string;
  readonly module: string;
  readonly entity: string;
  readonly importPermission: string;
  readonly exportPermission: string;
  readonly fields: readonly {
    readonly key: string;
    readonly required?: boolean;
    readonly exportable?: boolean;
  }[];
}
export class DataExchangeRegistry {
  readonly #templates = new Map<string, DataExchangeTemplate>();
  register(template: DataExchangeTemplate): void {
    const templateKey = key(template.key, "dataExchange.key");
    if (this.#templates.has(templateKey))
      throw new Error(`Template "${templateKey}" already exists.`);
    this.#templates.set(templateKey, { ...template, key: templateKey });
  }
  require(templateKey: string): DataExchangeTemplate {
    const template = this.#templates.get(templateKey);
    if (!template) throw new Error(`Template "${templateKey}" is not registered.`);
    return template;
  }
}
export class ImportExportEngine {
  constructor(
    private readonly registry: DataExchangeRegistry,
    private readonly jobs: JobQueue,
  ) {}
  async requestImport(input: {
    readonly context: ServiceContext;
    readonly templateKey: string;
    readonly fileId: EntityId<"file">;
    readonly permissionCodes: readonly string[];
  }) {
    const template = this.registry.require(input.templateKey);
    assertPermission(template.importPermission, input.permissionCodes);
    return this.jobs.enqueue("shared.import.run", {
      tenantId: input.context.tenantId,
      organizationId: input.context.organizationId,
      userId: input.context.userId,
      templateKey: template.key,
      fileId: input.fileId,
    });
  }
  async requestExport(input: {
    readonly context: ServiceContext;
    readonly templateKey: string;
    readonly permissionCodes: readonly string[];
    readonly allowedFields: readonly string[];
  }) {
    const template = this.registry.require(input.templateKey);
    assertPermission(template.exportPermission, input.permissionCodes);
    const allowed = new Set(input.allowedFields);
    const fields = template.fields
      .filter(({ exportable = true, key: fieldKey }) => exportable && allowed.has(fieldKey))
      .map(({ key: fieldKey }) => fieldKey);
    if (!fields.length) throw new Error("Export has no permitted fields.");
    return this.jobs.enqueue("shared.export.run", {
      tenantId: input.context.tenantId,
      organizationId: input.context.organizationId,
      userId: input.context.userId,
      templateKey: template.key,
      fields,
    });
  }
}
function assertPermission(requiredPermission: string, permissions: readonly string[]): void {
  if (!permissions.includes(requiredPermission)) throw new DataExchangePermissionDeniedError();
}
export class DataExchangePermissionDeniedError extends Error {
  constructor() {
    super("Import/export permission denied.");
    this.name = "DataExchangePermissionDeniedError";
  }
}
