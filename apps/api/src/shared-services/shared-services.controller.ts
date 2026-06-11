import { Controller, Get } from "@nestjs/common";
import {
  sharedServiceEventDefinitions,
  sharedServiceJobDefinitions,
} from "@tnvios/shared-services";

@Controller("shared-services")
export class SharedServicesController {
  @Get("capabilities")
  capabilities() {
    return {
      data: {
        engines: [
          "onboarding",
          "help-guidance",
          "activity-feed",
          "comments-mentions",
          "import-export",
          "inbound-email",
        ],
        events: sharedServiceEventDefinitions.map(({ eventType }) => eventType),
        jobs: sharedServiceJobDefinitions.map(({ name, queue }) => ({ name, queue })),
      },
    };
  }
}
