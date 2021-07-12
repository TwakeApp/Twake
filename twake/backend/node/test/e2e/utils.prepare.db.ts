import { TestPlatform } from "./setup";
import UserServiceAPI from "./../../src/services/user/api";
import User from "./../../src/services/user/entities/user";
import Company, {
  getInstance as getCompanyInstance,
} from "./../../src/services/user/entities/company";
import Workspace, {
  getInstance as getWorkspaceInstance,
  WorkspacePrimaryKey,
} from "./../../src/services/workspaces/entities/workspace";

export type uuid = string;

export class TestDbService {
  public company: Company;
  public users: User[];
  private workspacesMap: Map<string, { workspace: Workspace; users: User[] }>;
  private userService;

  rand = () => Math.floor(Math.random() * 100000);

  constructor(protected testPlatform: TestPlatform) {
    this.userService = this.testPlatform.platform.getProvider<UserServiceAPI>("user");
    this.users = [];
    this.workspacesMap = new Map<string, { workspace: Workspace; users: User[] }>();
  }

  public get workspaces() {
    return [...this.workspacesMap.values()];
  }

  async createCompany(id: uuid): Promise<void> {
    const name = `TwakeAutotests-test-company-${this.rand()}`;
    this.company = await this.userService.companies.createCompany(
      getCompanyInstance({
        id: id,
        name: name,
        displayName: name,
        identity_provider_id: id,
      }),
    );
  }

  async createWorkspace(workspacePk: WorkspacePrimaryKey): Promise<Workspace> {
    const name = `TwakeAutotests-test-workspace-${this.rand()}`;
    const workspace = await this.userService.workspaces.create(
      getWorkspaceInstance({
        id: workspacePk.id,
        name: name,
        logo: "workspace_logo",
        group_id: workspacePk.group_id,
      }),
    );

    const createdWorkspace = await this.userService.workspaces.get({
      id: workspacePk.id,
      group_id: workspacePk.group_id,
    });

    if (!createdWorkspace) {
      throw new Error("workspace wasn't created");
    }

    const createdWorkspaceEntity = workspace.entity;
    this.workspacesMap.set(createdWorkspaceEntity.id, {
      workspace: createdWorkspaceEntity,
      users: [],
    });
    return createdWorkspaceEntity;
  }

  async createUser(
    workspacesPk?: Array<WorkspacePrimaryKey>,
    options: {
      companyRole?: "member" | "admin" | "guest";
      workspaceRole?: "member" | "admin";
      firstName?: string;
      lastName?: string;
      email?: string;
      username?: string;
    } = {},
  ): Promise<User> {
    const user = new User();
    const random = this.rand();
    user.username_canonical = options.username || `test${random}`;
    user.first_name = options.firstName || `test${random}_first_name`;
    user.last_name = options.lastName || `test${random}_last_name`;
    user.email_canonical = options.email || `test${random}@twake.app`;
    const createdUser = await this.userService.users.create(user);
    this.users.push(createdUser.entity);
    await this.userService.companies.addUserInCompany(this.company, createdUser.entity);
    await this.userService.companies.setUserRole(
      { id: this.company.id },
      { id: createdUser.entity.id },
      options.companyRole ? options.companyRole : "member",
    );

    if (workspacesPk && workspacesPk.length) {
      for (const workspacePk of workspacesPk) {
        await this.userService.workspaces.addUser(
          workspacePk,
          { id: createdUser.entity.id },
          options.workspaceRole ? options.workspaceRole : "member",
        );
        const wsContainer = this.workspacesMap.get(workspacePk.id);
        wsContainer.users.push(createdUser.entity);
      }
    }

    return createdUser.entity;
  }
}
