import type { EventDefinition, EventEnvelope } from "./entities.js";

export class EventRegistry {
  readonly #definitions = new Map<string, EventDefinition>();
  register(definition: EventDefinition): void {
    const key = this.key(definition.eventType, definition.version);
    if (this.#definitions.has(key))
      throw new DuplicateEventDefinitionError(definition.eventType, definition.version);
    this.#definitions.set(key, definition);
  }
  get(eventType: string, version: number): EventDefinition | undefined {
    return this.#definitions.get(this.key(eventType, version));
  }
  validate(event: EventEnvelope): void {
    if (!this.get(event.eventType, event.eventVersion))
      throw new UnregisteredEventError(event.eventType, event.eventVersion);
  }
  list(): readonly EventDefinition[] {
    return [...this.#definitions.values()];
  }
  private key(eventType: string, version: number) {
    return `${eventType}@${version}`;
  }
}
export class DuplicateEventDefinitionError extends Error {
  constructor(type: string, version: number) {
    super(`Event "${type}" version ${version} is already registered.`);
    this.name = "DuplicateEventDefinitionError";
  }
}
export class UnregisteredEventError extends Error {
  constructor(type: string, version: number) {
    super(`Event "${type}" version ${version} is not registered.`);
    this.name = "UnregisteredEventError";
  }
}
