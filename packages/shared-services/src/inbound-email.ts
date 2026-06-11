import { createHash, timingSafeEqual } from "node:crypto";

import { createEntityId, type EntityId } from "@tnvios/database/identifiers";

import { required, type MutationRepository, type ServiceContext } from "./contracts.js";

export class InboundEmailMessage {
  readonly id: EntityId<"inbound_email_message"> = createEntityId();
  readonly receivedAt = new Date();
  status: "received" | "processed" | "rejected" = "received";
  constructor(
    readonly context: ServiceContext,
    readonly providerMessageId: string,
    readonly from: string,
    readonly to: string,
    readonly subject: string,
    readonly body: string,
  ) {
    this.providerMessageId = required(providerMessageId, "inboundEmail.providerMessageId");
    this.from = required(from, "inboundEmail.from");
    this.to = required(to, "inboundEmail.to");
    this.subject = required(subject, "inboundEmail.subject");
    this.body = required(body, "inboundEmail.body");
  }
}
export interface InboundEmailRepository extends MutationRepository<InboundEmailMessage> {
  hasProviderMessage(providerMessageId: string): Promise<boolean>;
}
export class InboundEmailEngine {
  constructor(
    private readonly repository: InboundEmailRepository,
    private readonly secret: string,
  ) {}
  async receive(input: {
    readonly context: ServiceContext;
    readonly providerMessageId: string;
    readonly from: string;
    readonly to: string;
    readonly subject: string;
    readonly body: string;
    readonly signature: string;
  }): Promise<InboundEmailMessage> {
    if (!verify(input.providerMessageId, input.signature, this.secret))
      throw new InvalidInboundEmailSignatureError();
    if (await this.repository.hasProviderMessage(input.providerMessageId))
      throw new DuplicateInboundEmailError();
    const message = new InboundEmailMessage(
      input.context,
      input.providerMessageId,
      input.from,
      input.to,
      input.subject,
      input.body,
    );
    await this.repository.save(message, {
      eventType: "inbound_email.message.received",
      aggregateType: "inbound_email_message",
      aggregateId: message.id,
      payload: { providerMessageId: message.providerMessageId },
    });
    return message;
  }
}
export function inboundEmailSignature(providerMessageId: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${providerMessageId}`).digest("hex");
}
function verify(providerMessageId: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(inboundEmailSignature(providerMessageId, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export class InvalidInboundEmailSignatureError extends Error {
  constructor() {
    super("Inbound email signature is invalid.");
    this.name = "InvalidInboundEmailSignatureError";
  }
}
export class DuplicateInboundEmailError extends Error {
  constructor() {
    super("Inbound email was already processed.");
    this.name = "DuplicateInboundEmailError";
  }
}
