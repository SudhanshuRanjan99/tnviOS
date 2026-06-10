import { describe, expect, it } from "vitest";
import { filterFields, filterRecords } from "./security.js";

describe("field and record security", () => {
  it("returns only explicitly allowed fields", () => {
    expect(filterFields({ id: "1", name: "A", salary: 100 }, ["id", "name"])).toEqual({
      id: "1",
      name: "A",
    });
  });
  it("returns only records accepted by the access predicate", () => {
    expect(
      filterRecords([{ owner: "a" }, { owner: "b" }], (record) => record.owner === "a"),
    ).toEqual([{ owner: "a" }]);
  });
});
