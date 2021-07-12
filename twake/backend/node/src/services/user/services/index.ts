import { TwakeContext } from "../../../core/platform/framework";
import { DatabaseServiceAPI } from "../../../core/platform/services/database/api";
import UserServiceAPI, {
  CompaniesServiceAPI,
  UserExternalLinksServiceAPI,
  UsersServiceAPI,
} from "../api";
import { getService as getUserService } from "./users";
import { getService as getCompanyService } from "./companies";
import { getService as getExternalService } from "./external_links";
import { getService as getWorkspaceService } from "../../workspaces/services/workspace";
import { WorkspaceServiceAPI } from "../../workspaces/api";
import { SearchServiceAPI } from "../../../core/platform/services/search/api";

export function getService(
  databaseService: DatabaseServiceAPI,
  searchService: SearchServiceAPI,
): UserServiceAPI {
  return new Service(databaseService, searchService);
}

class Service implements UserServiceAPI {
  version: "1";
  users: UsersServiceAPI;
  companies: CompaniesServiceAPI;
  external: UserExternalLinksServiceAPI;
  workspaces: WorkspaceServiceAPI;

  constructor(databaseService: DatabaseServiceAPI, searchService: SearchServiceAPI) {
    this.users = getUserService(databaseService, searchService);
    this.external = getExternalService(databaseService);
    this.companies = getCompanyService(databaseService);
    this.workspaces = getWorkspaceService(databaseService);
  }

  async init(context: TwakeContext): Promise<this> {
    try {
      await Promise.all([
        this.users.init(context),
        this.companies.init(context),
        this.external.init(context),
        this.workspaces.init(context),
      ]);
    } catch (err) {
      console.error("Error while initializing user service", err);
    }
    return this;
  }
}
