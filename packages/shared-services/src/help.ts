import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

import { key, required, type ServiceContext } from "./contracts.js";

export interface HelpContext {
  readonly module: string;
  readonly page?: string;
  readonly role?: string;
  readonly permissionCodes?: readonly string[];
  readonly entityType?: string;
  readonly workflowState?: string;
}
export class HelpArticle {
  readonly id: EntityId<"help_article"> = createEntityId();
  readonly key: string;
  readonly title: string;
  readonly body: string;
  constructor(input: {
    readonly key: string;
    readonly title: string;
    readonly body: string;
    readonly context: HelpContext;
    readonly requiredPermission?: string;
  }) {
    this.key = key(input.key, "help.key");
    this.title = required(input.title, "help.title");
    this.body = required(input.body, "help.body");
    this.context = input.context;
    this.requiredPermission = input.requiredPermission;
  }
  readonly context: HelpContext;
  readonly requiredPermission?: string;
}
export class HelpGuidanceEngine {
  constructor(private readonly articles: readonly HelpArticle[]) {}
  resolve(
    _context: ServiceContext,
    request: HelpContext & { readonly permissionCodes: readonly string[] },
  ): readonly HelpArticle[] {
    return this.articles.filter(
      (article) =>
        article.context.module === request.module &&
        matches(article.context.page, request.page) &&
        matches(article.context.role, request.role) &&
        matches(article.context.entityType, request.entityType) &&
        matches(article.context.workflowState, request.workflowState) &&
        (!article.requiredPermission ||
          request.permissionCodes.includes(article.requiredPermission)),
    );
  }
}
function matches(expected: string | undefined, actual: string | undefined): boolean {
  return expected === undefined || expected === actual;
}
