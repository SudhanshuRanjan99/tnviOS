export interface RenderedTemplate {
  readonly subject: string;
  readonly body: string;
}

export class EmailTemplateRenderer {
  render(
    template: { readonly subject: string; readonly body: string },
    variables: Record<string, string | number | boolean | null>,
  ): RenderedTemplate {
    return {
      subject: this.interpolate(template.subject, variables),
      body: this.interpolate(template.body, variables),
    };
  }

  private interpolate(
    source: string,
    variables: Record<string, string | number | boolean | null>,
  ): string {
    return source.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*\}\}/g, (_match, key: string) => {
      const value = variables[key];
      if (value === undefined) throw new MissingTemplateVariableError(key);
      return value === null ? "" : String(value);
    });
  }
}

export class MissingTemplateVariableError extends Error {
  constructor(key: string) {
    super(`Template variable "${key}" is required.`);
    this.name = "MissingTemplateVariableError";
  }
}
