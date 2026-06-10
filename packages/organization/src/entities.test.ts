import { createEntityId } from "@tnvios/database/identifiers";
import { describe, expect, it } from "vitest";

import { BusinessUnit, InvalidOrganizationFieldError, Organization, Tenant } from "./entities.js";

describe("organization entities", () => {
  it("normalizes tenant slugs and organization codes", () => {
    const tenant = new Tenant({ name: " Acme ", slug: "ACME-HOLDINGS" });
    const organization = new Organization({
      tenantId: tenant.id,
      name: "Acme Nepal",
      country: "np",
      currency: "npr",
    });
    const unit = new BusinessUnit({
      tenantId: tenant.id,
      organizationId: organization.id,
      name: "Services",
      code: "svc",
    });
    expect(tenant).toMatchObject({ name: "Acme", slug: "acme-holdings" });
    expect(organization).toMatchObject({ country: "NP", currency: "NPR" });
    expect(unit.code).toBe("SVC");
  });

  it("rejects malformed tenant slugs and empty names", () => {
    expect(() => new Tenant({ name: "Acme", slug: "not valid" })).toThrow(
      InvalidOrganizationFieldError,
    );
    expect(
      () =>
        new BusinessUnit({
          tenantId: createEntityId(),
          organizationId: createEntityId(),
          name: " ",
          code: "x",
        }),
    ).toThrow(InvalidOrganizationFieldError);
  });
});
