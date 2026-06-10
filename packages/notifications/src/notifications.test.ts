import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it, vi } from "vitest";

import { DELIVER_EMAIL_JOB, EmailNotificationDelivery, NotificationEngine } from "./engine.js";
import { Notification, NotificationTemplate } from "./entities.js";
import { EmailTemplateRenderer, MissingTemplateVariableError } from "./templates.js";

const tenantId = createEntityId<"tenant">();
const userId = createEntityId<"user">();

describe("EmailTemplateRenderer", () => {
  it("renders explicit variables and rejects missing values", () => {
    const renderer = new EmailTemplateRenderer();
    expect(
      renderer.render(
        { subject: "Hi {{name}}", body: "Count: {{count}}" },
        { name: "Ada", count: 2 },
      ),
    ).toEqual({ subject: "Hi Ada", body: "Count: 2" });
    expect(() => renderer.render({ subject: "{{missing}}", body: "Body" }, {})).toThrow(
      MissingTemplateVariableError,
    );
  });
});

describe("NotificationEngine", () => {
  it("creates in-app notifications and queues email delivery", async () => {
    const templates = [
      new NotificationTemplate({
        tenantId,
        key: "welcome",
        channel: "in-app",
        subject: "Hi {{name}}",
        body: "Welcome",
      }),
      new NotificationTemplate({
        tenantId,
        key: "welcome",
        channel: "email",
        subject: "Hi {{name}}",
        body: "<p>Welcome</p>",
      }),
    ];
    const repository = {
      create: vi.fn(),
      save: vi.fn(),
      findTemplate: vi.fn(
        async (_tenantId, _key, channel) =>
          templates.find((template) => template.channel === channel) ?? null,
      ),
      findNotification: vi.fn(),
    };
    const jobs = {
      enqueue: vi.fn(async (name) => ({ id: "1", name, queue: "email" as const })),
      close: vi.fn(),
    };
    const notifications = await new NotificationEngine(repository, jobs).create({
      tenantId,
      userId,
      templateKey: "welcome",
      channels: ["in-app", "email"],
      variables: { name: "Ada" },
      recipient: "ada@example.com",
    });
    expect(notifications.map(({ channel, status }) => ({ channel, status }))).toEqual([
      { channel: "in-app", status: "sent" },
      { channel: "email", status: "queued" },
    ]);
    expect(jobs.enqueue).toHaveBeenCalledWith(DELIVER_EMAIL_JOB, {
      notificationId: notifications[1]?.id,
    });
  });
});

describe("EmailNotificationDelivery", () => {
  it("records provider delivery and marks the notification sent", async () => {
    const notification = new Notification({
      tenantId,
      userId,
      title: "Welcome",
      message: "<p>Welcome</p>",
      channel: "email",
      recipient: "ada@example.com",
    });
    const repository = {
      create: vi.fn(),
      save: vi.fn(),
      findTemplate: vi.fn(),
      findNotification: vi.fn(async () => notification),
    };
    const delivery = await new EmailNotificationDelivery(
      repository,
      { name: "test", sendEmail: vi.fn(async () => ({ messageId: "message-1" })) },
      "Tnvios <notifications@example.com>",
    ).deliver(notification.id);
    expect(delivery).toMatchObject({ status: "sent", providerMessageId: "message-1" });
    expect(notification.status).toBe("sent");
  });
});
