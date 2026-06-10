import { Resend } from "resend";

export interface SendEmailInput {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
}

export interface SendEmailResult {
  readonly messageId: string;
}

export interface EmailProvider {
  readonly name: string;
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}

export class ResendProvider implements EmailProvider {
  readonly name = "resend";
  readonly #client: Resend;

  constructor(apiKey: string, client?: Resend) {
    this.#client = client ?? new Resend(apiKey);
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const { data, error } = await this.#client.emails.send(input);
    if (error) throw new EmailProviderError(this.name, error.message);
    if (!data?.id) throw new EmailProviderError(this.name, "Provider returned no message id.");
    return { messageId: data.id };
  }
}

export class EmailProviderError extends Error {
  constructor(provider: string, message: string) {
    super(`${provider} email delivery failed: ${message}`);
    this.name = "EmailProviderError";
  }
}
