import {
  TransactionPropagation,
  type IsolationLevel,
  type TransactionOptions,
} from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";

import type { MutationContext } from "./contracts.js";

export type SafeTransactionPropagation =
  | TransactionPropagation.REQUIRED
  | TransactionPropagation.REQUIRES_NEW
  | TransactionPropagation.NESTED
  | TransactionPropagation.MANDATORY;

export interface TransactionRunOptions {
  readonly isolationLevel?: IsolationLevel | `${IsolationLevel}`;
  readonly propagation?: SafeTransactionPropagation;
  readonly signal?: AbortSignal;
}

export interface TransactionWorkContext<EntityManagerType> {
  readonly entityManager: EntityManagerType;
  readonly mutationContext: MutationContext;
}

export interface TransactionalEntityManager<EntityManagerType> {
  transactional<Result>(
    work: (entityManager: EntityManagerType) => Result | Promise<Result>,
    options?: TransactionOptions,
  ): Promise<Result>;
}

export class UnsafeTransactionPropagationError extends Error {
  constructor(propagation: string) {
    super(`Transaction propagation "${propagation}" does not guarantee an active transaction.`);
    this.name = "UnsafeTransactionPropagationError";
  }
}

const safeTransactionPropagations = new Set<string>([
  TransactionPropagation.REQUIRED,
  TransactionPropagation.REQUIRES_NEW,
  TransactionPropagation.NESTED,
  TransactionPropagation.MANDATORY,
]);

export class TransactionManager<
  EntityManagerType extends TransactionalEntityManager<EntityManagerType> = EntityManager,
> {
  constructor(private readonly entityManager: EntityManagerType) {}

  run<Result>(
    mutationContext: MutationContext,
    work: (context: TransactionWorkContext<EntityManagerType>) => Result | Promise<Result>,
    options: TransactionRunOptions = {},
  ): Promise<Result> {
    const propagation = options.propagation ?? TransactionPropagation.REQUIRED;

    if (!safeTransactionPropagations.has(propagation)) {
      throw new UnsafeTransactionPropagationError(propagation);
    }

    return this.entityManager.transactional(
      (entityManager) => work({ entityManager, mutationContext }),
      {
        isolationLevel: options.isolationLevel,
        propagation,
        readOnly: false,
        signal: options.signal,
      },
    );
  }
}
