import { MessageLocalEvent } from "../../../../types";
import { MessageServiceAPI } from "../../../../api";
import { DatabaseServiceAPI } from "../../../../../../core/platform/services/database/api";

export class UserMarkedViewProcessor {
  constructor(readonly database: DatabaseServiceAPI, readonly service: MessageServiceAPI) {}

  async process(message: MessageLocalEvent): Promise<void> {}
}
