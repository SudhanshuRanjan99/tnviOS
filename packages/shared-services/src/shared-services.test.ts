import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import {
  ActivityFeedEngine,
  CommentsMentionsEngine,
  DataExchangePermissionDeniedError,
  DataExchangeRegistry,
  HelpArticle,
  HelpGuidanceEngine,
  ImportExportEngine,
  inboundEmailSignature,
  InboundEmailEngine,
  InvalidInboundEmailSignatureError,
  MentionAccessDeniedError,
  OnboardingEngine,
  OnboardingRegistry,
} from "./index.js";

const context = {
  tenantId: createEntityId<"tenant">(),
  organizationId: createEntityId<"organization">(),
  userId: createEntityId<"user">(),
};
const target = { entityType: "finance.invoice", entityId: createEntityId<"invoice">() };
const mutationRepository = () => ({ save: vi.fn() });

describe("OnboardingEngine", () => {
  it("completes a flow when all required steps are complete", async () => {
    const registry = new OnboardingRegistry();
    registry.register({
      key: "organization.setup",
      audience: "admin",
      steps: [
        { key: "create_org", title: "Create organization" },
        { key: "invite_users", title: "Invite users" },
        { key: "optional_tour", title: "View tour", required: false },
      ],
    });
    const repository = mutationRepository();
    const engine = new OnboardingEngine(registry, repository);
    const progress = await engine.start(context, "organization.setup");
    await engine.completeStep(progress, "create_org");
    await engine.completeStep(progress, "invite_users");
    expect(progress.status).toBe("completed");
    expect(repository.save).toHaveBeenLastCalledWith(
      progress,
      expect.objectContaining({ eventType: "onboarding.flow.completed" }),
    );
  });
});

describe("HelpGuidanceEngine", () => {
  it("resolves contextual help without leaking permission-protected articles", () => {
    const engine = new HelpGuidanceEngine([
      new HelpArticle({
        key: "finance.invoice.approval",
        title: "Approval policy",
        body: "Policy",
        context: { module: "finance", page: "invoice" },
        requiredPermission: "finance.invoice.approve",
      }),
    ]);
    expect(
      engine.resolve(context, { module: "finance", page: "invoice", permissionCodes: [] }),
    ).toEqual([]);
    expect(
      engine.resolve(context, {
        module: "finance",
        page: "invoice",
        permissionCodes: ["finance.invoice.approve"],
      }),
    ).toHaveLength(1);
  });
});

describe("ActivityFeedEngine", () => {
  it("filters timeline entries by visibility principals", async () => {
    const engine = new ActivityFeedEngine(mutationRepository());
    const visible = await engine.record([
      context,
      target,
      "workflow.task.approved",
      "Invoice approved",
      [`user:${context.userId}`],
    ]);
    const restricted = await engine.record([
      context,
      target,
      "file.uploaded",
      "Restricted file",
      ["role:finance"],
    ]);
    expect(engine.filterVisible([visible, restricted], [`user:${context.userId}`])).toEqual([
      visible,
    ]);
  });
});

describe("CommentsMentionsEngine", () => {
  it("blocks mentions when the mentioned user cannot access the target", async () => {
    const mentionedUserId = createEntityId<"user">();
    const repository = { ...mutationRepository(), saveMentions: vi.fn() };
    const engine = new CommentsMentionsEngine(
      repository,
      vi.fn(async () => false),
    );
    await expect(
      engine.create({
        context,
        target,
        body: "Please review",
        mentionedUserIds: [mentionedUserId],
      }),
    ).rejects.toBeInstanceOf(MentionAccessDeniedError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe("ImportExportEngine", () => {
  it("filters exports to permitted, exportable fields", async () => {
    const registry = new DataExchangeRegistry();
    registry.register({
      key: "crm.customer",
      module: "crm",
      entity: "customer",
      importPermission: "crm.customer.import",
      exportPermission: "crm.customer.export",
      fields: [{ key: "name" }, { key: "email" }, { key: "secret", exportable: false }],
    });
    const jobs = {
      enqueue: vi.fn(async (name) => ({ id: "1", name, queue: "exports" as const })),
      close: vi.fn(),
    };
    const engine = new ImportExportEngine(registry, jobs);
    await engine.requestExport({
      context,
      templateKey: "crm.customer",
      permissionCodes: ["crm.customer.export"],
      allowedFields: ["name", "secret"],
    });
    expect(jobs.enqueue).toHaveBeenCalledWith(
      "shared.export.run",
      expect.objectContaining({ fields: ["name"] }),
    );
    await expect(
      engine.requestExport({
        context,
        templateKey: "crm.customer",
        permissionCodes: [],
        allowedFields: ["name"],
      }),
    ).rejects.toBeInstanceOf(DataExchangePermissionDeniedError);
  });
});

describe("InboundEmailEngine", () => {
  it("verifies provider signatures and rejects invalid messages", async () => {
    const repository = { ...mutationRepository(), hasProviderMessage: vi.fn(async () => false) };
    const engine = new InboundEmailEngine(repository, "secret");
    const input = {
      context,
      providerMessageId: "provider-1",
      from: "sender@example.com",
      to: "action@example.com",
      subject: "Approve",
      body: "Approved",
    };
    await expect(
      engine.receive({ ...input, signature: inboundEmailSignature("provider-1", "secret") }),
    ).resolves.toMatchObject({ status: "received" });
    await expect(engine.receive({ ...input, signature: "invalid" })).rejects.toBeInstanceOf(
      InvalidInboundEmailSignatureError,
    );
  });
});
