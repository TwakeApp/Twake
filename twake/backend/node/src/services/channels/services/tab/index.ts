import { DatabaseServiceAPI } from "../../../../core/platform/services/database/api";
import { TabService } from "../../provider";
import { Service } from "./service";

export function getService(databaseService: DatabaseServiceAPI): TabService {
  return new Service(getServiceInstance(databaseService));
}

function getServiceInstance(databaseService: DatabaseServiceAPI): TabService {
  return null;
}
