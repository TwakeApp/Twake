import {
  CRUDService,
  DeleteResult,
  ExecutionContext,
  ListResult,
  Paginable,
  Pagination,
} from "../../core/platform/framework/api/crud-service";
import { Initializable, TwakeServiceProvider } from "../../core/platform/framework/api";
import User, { UserPrimaryKey } from "./entities/user";
import CompanyUser, { CompanyUserPrimaryKey } from "./entities/company_user";
import Company, { CompanyPrimaryKey } from "./entities/company";
import ExternalUser from "./entities/external_user";
import ExternalGroup from "./entities/external_company";
import WorkspaceUser, { WorkspaceUserPrimaryKey } from "./entities/workspace_user";
import Workspace, { WorkspacePrimaryKey } from "./entities/workspace";
import { Observable } from "rxjs";
import { ListUserOptions } from "./services/users/types";
import { UserCompanyRole } from "./web/types";
import { ListWorkspaceOptions } from "./services/workspace/types";

export default interface UserServiceAPI extends TwakeServiceProvider, Initializable {
  users: UsersServiceAPI;
  companies: CompaniesServiceAPI;
  workspaces: WorkspaceServiceAPI;
  external: UserExternalLinksServiceAPI;
}

export interface UsersServiceAPI
  extends TwakeServiceProvider,
    Initializable,
    CRUDService<User, UserPrimaryKey, ExecutionContext> {
  getUserCompanies(pk: UserPrimaryKey, pagination?: Pagination): Promise<ListResult<CompanyUser>>;
}

/**
 * Service to manage links between external and internal users/companies.
 */
export interface UserExternalLinksServiceAPI extends TwakeServiceProvider, Initializable {
  /**
   * Create a external user link
   *
   * @param user
   */
  createExternalUser(user: ExternalUser): Promise<ExternalUser>;

  /**
   * Create an external group link
   *
   * @param group
   */
  createExternalGroup(group: ExternalGroup): Promise<ExternalGroup>;
}
export interface CompaniesServiceAPI extends TwakeServiceProvider, Initializable {
  /**
   * Create a company
   *
   * @param company
   */
  createCompany(company: Company): Promise<Company>;

  /**
   * Get a company from its id
   *
   * @param companyId
   */
  getCompany(companyId: CompanyPrimaryKey): Promise<Company>;

  /**
   * Get the companies
   *
   * @param pagination
   */
  getCompanies(pagination?: Paginable): Promise<ListResult<Company>>;

  /**
   * Get all companies for a user
   * @param company
   * @param user
   */
  getAllForUser(user: Pick<CompanyUser, "user_id">): Promise<ListResult<CompanyUser>>;

  /**
   * Add a user in a company
   *
   * @param company
   * @param user
   */
  addUserInCompany(companyId: CompanyPrimaryKey, userId: UserPrimaryKey): Promise<CompanyUser>;

  /**
   * Add a user in a company
   *
   * @param company
   * @param user
   */
  removeUserFromCompany(companyId: CompanyPrimaryKey, user: UserPrimaryKey): Promise<void>;

  /**
   * Get user ids in the given company
   *
   * @param companyId
   * @param pagination
   */
  getUsers(
    companyId: CompanyUserPrimaryKey,
    pagination?: Paginable,
    options?: ListUserOptions,
  ): Promise<ListResult<CompanyUser>>;

  /**
   *  Get company user
   * @param company
   * @param user
   */
  getCompanyUser(company: CompanyPrimaryKey, user: UserPrimaryKey): Promise<CompanyUser>;

  delete(pk: CompanyPrimaryKey, context?: ExecutionContext): Promise<DeleteResult<Company>>;

  setUserRole(
    companyPk: CompanyPrimaryKey,
    userPk: UserPrimaryKey,
    role: UserCompanyRole,
  ): Promise<void>;
}

export interface WorkspaceServiceAPI
  extends TwakeServiceProvider,
    Initializable,
    CRUDService<Workspace, WorkspacePrimaryKey, ExecutionContext> {
  /**
   * Get workspace users in the given workspace
   *
   * @param workspaceId
   * @param pagination
   */
  getUsers(
    workspaceId: Pick<WorkspaceUserPrimaryKey, "workspaceId">,
    pagination?: Paginable,
  ): Promise<ListResult<WorkspaceUser>>;

  /**
   * Get workspace user in the given workspace
   *
   * @param workspaceId
   * @param userId
   */
  getUser(
    workspaceUser: Pick<WorkspaceUserPrimaryKey, "workspaceId" | "userId">,
  ): Promise<WorkspaceUser>;

  /**
   * Get all the workspace for a user
   *
   * @param userId
   */
  getAllForUser(
    userId: Pick<WorkspaceUserPrimaryKey, "userId">,
  ): Promise<ListResult<WorkspaceUser>>;

  /**
   * Get all the users of a workspace as Observable
   *
   * @param workspaceId
   */
  getAllUsers$(
    workspaceId: Pick<WorkspaceUserPrimaryKey, "workspaceId">,
  ): Observable<WorkspaceUser>;

  /**
   * Paginate over all the users of a workspace
   *
   * @param workspaceId
   * @param pagination
   */
  getAllUsers$(
    workspaceId: Pick<WorkspaceUserPrimaryKey, "workspaceId">,
    pagination: Paginable,
  ): Observable<WorkspaceUser>;

  /**
   * Get the workspaces
   *
   * @param pagination
   */
  getWorkspaces(
    pagination?: Pagination,
    options?: ListWorkspaceOptions,
    context?: ExecutionContext,
  ): Promise<ListResult<Workspace>>;
}
