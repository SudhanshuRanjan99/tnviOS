import { describe, expect, it } from "vitest";

import {
  createRawSqlQuery,
  EmptyRawSqlQueryError,
  RawSqlHelper,
  RawSqlMutationOutsideTransactionError,
  type RawSqlDriver,
  type RawSqlMutationResult,
  type RawSqlQuery,
} from "./raw-sql.js";

interface ExampleRow {
  readonly id: string;
}

class FakeRawSqlDriver implements RawSqlDriver {
  inTransaction = false;
  lastQuery: RawSqlQuery | undefined;

  async all<Row extends object>(query: RawSqlQuery): Promise<readonly Row[]> {
    this.lastQuery = query;
    return [{ id: "example-id" }] as unknown as readonly Row[];
  }

  isInTransaction(): boolean {
    return this.inTransaction;
  }

  async mutate(query: RawSqlQuery): Promise<RawSqlMutationResult> {
    this.lastQuery = query;
    return { affectedRows: 2 };
  }

  async one<Row extends object>(query: RawSqlQuery): Promise<Row | null> {
    this.lastQuery = query;
    return { id: "example-id" } as unknown as Row;
  }
}

describe("createRawSqlQuery", () => {
  it("keeps SQL text and bound parameters separate", () => {
    const query = createRawSqlQuery("select * from users where tenant_id = ?", ["tenant-id"]);

    expect(query).toEqual({
      parameters: ["tenant-id"],
      text: "select * from users where tenant_id = ?",
    });
  });

  it("rejects empty SQL", () => {
    expect(() => createRawSqlQuery("  ")).toThrowError(EmptyRawSqlQueryError);
  });
});

describe("RawSqlHelper", () => {
  it("returns typed rows and passes bound parameters to the driver", async () => {
    const driver = new FakeRawSqlDriver();
    const helper = new RawSqlHelper(driver);
    const query = createRawSqlQuery("select id from users where tenant_id = ?", ["tenant-id"]);

    const rows = await helper.all<ExampleRow>(query);

    expect(rows[0]?.id).toBe("example-id");
    expect(driver.lastQuery).toBe(query);
  });

  it("returns one typed row", async () => {
    const helper = new RawSqlHelper(new FakeRawSqlDriver());

    const row = await helper.one<ExampleRow>(createRawSqlQuery("select id from users limit 1"));

    expect(row?.id).toBe("example-id");
  });

  it("rejects mutations outside a transaction", () => {
    const helper = new RawSqlHelper(new FakeRawSqlDriver());

    expect(() =>
      helper.mutate(createRawSqlQuery("update users set status = ?", ["active"])),
    ).toThrowError(RawSqlMutationOutsideTransactionError);
  });

  it("executes mutations inside a transaction", async () => {
    const driver = new FakeRawSqlDriver();
    driver.inTransaction = true;
    const helper = new RawSqlHelper(driver);

    const result = await helper.mutate(
      createRawSqlQuery("update users set status = ? where tenant_id = ?", ["active", "tenant-id"]),
    );

    expect(result.affectedRows).toBe(2);
  });
});
