import { TransactionPropagation, type TransactionOptions } from "@mikro-orm/core";
import { describe, expect, it } from "vitest";

import type { MutationContext } from "./contracts.js";
import { createEntityId } from "./identifiers.js";
import {
  TransactionManager,
  UnsafeTransactionPropagationError,
  type TransactionalEntityManager,
} from "./transaction-manager.js";

class FakeEntityManager implements TransactionalEntityManager<FakeEntityManager> {
  lastOptions: TransactionOptions | undefined;
  transactionCount = 0;

  async transactional<Result>(
    work: (entityManager: FakeEntityManager) => Result | Promise<Result>,
    options?: TransactionOptions,
  ): Promise<Result> {
    this.lastOptions = options;
    this.transactionCount += 1;

    return work(this);
  }
}

const mutationContext: MutationContext = {
  correlationId: createEntityId<"correlation">(),
  organizationId: createEntityId<"organization">(),
  tenantId: createEntityId<"tenant">(),
  userId: createEntityId<"user">(),
};

describe("TransactionManager", () => {
  it("runs work with the transaction-scoped entity manager and mutation context", async () => {
    const entityManager = new FakeEntityManager();
    const transactionManager = new TransactionManager(entityManager);

    const result = await transactionManager.run(
      mutationContext,
      ({ entityManager: em, mutationContext: context }) => {
        expect(em).toBe(entityManager);
        expect(context).toBe(mutationContext);

        return "committed";
      },
    );

    expect(result).toBe("committed");
    expect(entityManager.transactionCount).toBe(1);
  });

  it("defaults to a required, writable transaction", async () => {
    const entityManager = new FakeEntityManager();
    const transactionManager = new TransactionManager(entityManager);

    await transactionManager.run(mutationContext, () => undefined);

    expect(entityManager.lastOptions).toMatchObject({
      propagation: TransactionPropagation.REQUIRED,
      readOnly: false,
    });
  });

  it("passes safe transaction options to MikroORM", async () => {
    const entityManager = new FakeEntityManager();
    const transactionManager = new TransactionManager(entityManager);

    await transactionManager.run(mutationContext, () => undefined, {
      propagation: TransactionPropagation.NESTED,
    });

    expect(entityManager.lastOptions?.propagation).toBe(TransactionPropagation.NESTED);
  });

  it("propagates work errors so MikroORM can roll back", async () => {
    const transactionManager = new TransactionManager(new FakeEntityManager());
    const error = new Error("business write failed");

    await expect(
      transactionManager.run(mutationContext, () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });

  it("rejects propagation modes that can execute without a transaction", () => {
    const transactionManager = new TransactionManager(new FakeEntityManager());
    const unsafeOptions = {
      propagation: TransactionPropagation.NOT_SUPPORTED,
    } as unknown as Parameters<typeof transactionManager.run>[2];

    expect(() =>
      transactionManager.run(mutationContext, () => undefined, unsafeOptions),
    ).toThrowError(UnsafeTransactionPropagationError);
  });
});
