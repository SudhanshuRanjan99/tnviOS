import { ConsumerReceipt, type EventEnvelope } from "./entities.js";

export interface ConsumerReceiptRepository {
  runOnce(receipt: ConsumerReceipt, work: () => Promise<void>): Promise<boolean>;
}
export interface EventConsumer {
  readonly name: string;
  handle(event: EventEnvelope): Promise<void>;
}
export interface ConsumerResult {
  readonly processed: boolean;
  readonly reason: "PROCESSED" | "DUPLICATE";
}

export class IdempotentConsumerRunner {
  constructor(private readonly receipts: ConsumerReceiptRepository) {}
  async consume(consumer: EventConsumer, event: EventEnvelope): Promise<ConsumerResult> {
    const processed = await this.receipts.runOnce(
      new ConsumerReceipt({ eventId: event.eventId, consumerName: consumer.name }),
      () => consumer.handle(event),
    );
    return processed
      ? { processed: true, reason: "PROCESSED" }
      : { processed: false, reason: "DUPLICATE" };
  }
}
