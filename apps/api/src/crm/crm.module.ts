import { Module } from "@nestjs/common";

import { EventsModule } from "../events/events.module.js";
import { CrmController } from "./crm.controller.js";
import { CrmPersistence } from "./crm.persistence.js";
import { CrmService } from "./crm.service.js";

@Module({ imports: [EventsModule], controllers: [CrmController], providers: [CrmPersistence, CrmService], exports: [CrmService] })
export class CrmModule {}
