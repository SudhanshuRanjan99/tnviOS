import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthorizationGuard } from "./authorization.guard.js";
import { PolicyController } from "./policy.controller.js";
import { PolicyPersistence } from "./policy.persistence.js";

@Module({
  controllers: [PolicyController],
  exports: [PolicyPersistence],
  providers: [PolicyPersistence, { provide: APP_GUARD, useClass: AuthorizationGuard }],
})
export class PolicyModule {}
