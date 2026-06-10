import { Module } from "@nestjs/common";

import { EventsModule } from "../events/events.module.js";
import { ApiFileEngine } from "./file-engine.provider.js";
import { FilesController } from "./files.controller.js";
import { FilesPersistence } from "./files.persistence.js";
import { FilesService } from "./files.service.js";

@Module({
  imports: [EventsModule],
  controllers: [FilesController],
  providers: [ApiFileEngine, FilesPersistence, FilesService],
  exports: [FilesService],
})
export class FilesModule {}
