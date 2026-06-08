import { validate, v7, version } from "uuid";

declare const entityIdBrand: unique symbol;

export type EntityId<EntityName extends string = string> = string & {
  readonly [entityIdBrand]: EntityName;
};

export class InvalidEntityIdError extends Error {
  constructor() {
    super("Entity ID must be a valid UUID");
    this.name = "InvalidEntityIdError";
  }
}

export function createEntityId<EntityName extends string>(): EntityId<EntityName> {
  return v7() as EntityId<EntityName>;
}

export function parseEntityId<EntityName extends string>(value: string): EntityId<EntityName> {
  if (!validate(value)) {
    throw new InvalidEntityIdError();
  }

  return value as EntityId<EntityName>;
}

export function isEntityId(value: string): value is EntityId {
  return validate(value);
}

export function isUuidV7(value: string): boolean {
  return validate(value) && version(value) === 7;
}
