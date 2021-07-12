import { SearchServiceAPI } from "../../../../core/platform/services/search/api";
import { DatabaseServiceAPI } from "../../../../core/platform/services/database/api";
import { UserService } from "./service";

export function getService(
  databaseService: DatabaseServiceAPI,
  searchService: SearchServiceAPI,
): UserService {
  return new UserService(databaseService, searchService);
}
