import { Module } from "@nestjs/common";

import { SharedServicesController } from "./shared-services.controller.js";

@Module({ controllers: [SharedServicesController] })
export class SharedServicesModule {}
