import { CrudController } from "../../../../core/platform/services/webserver/types";
import {
  ResourceCreateResponse,
  ResourceDeleteResponse,
  ResourceGetResponse,
  ResourceListResponse,
  uuid
} from "../../../../utils/types";
import { WorkspaceServiceAPI } from "../../api";
import {
  WorkspaceUserInvitationResponse,
  WorkspaceUserObject,
  WorkspaceUsersAddBody,
  WorkspaceUsersBaseRequest,
  WorkspaceUsersInvitationRequest,
  WorkspaceUsersRequest
} from "../types";
import { FastifyReply, FastifyRequest } from "fastify";
import { CompaniesServiceAPI, UsersServiceAPI } from "../../../user/api";

import { WorkspaceUsersExecutionContext } from "../../types";
import WorkspaceUser from "../../entities/workspace_user";
import User from "../../../user/entities/user";
import CompanyUser from "../../../user/entities/company_user";
import { CompanyShort, CompanyUserRole, CompanyUserStatus } from "../../../user/web/types";
import Company from "../../../user/entities/company";
import { chain } from "lodash";

export class WorkspaceUsersCrudController
  implements
    CrudController<
      ResourceGetResponse<WorkspaceUserObject>,
      ResourceCreateResponse<WorkspaceUserObject>,
      ResourceListResponse<WorkspaceUserObject>,
      ResourceDeleteResponse
    > {
  constructor(
    protected workspaceService: WorkspaceServiceAPI,
    protected companyService: CompaniesServiceAPI,
    protected usersService: UsersServiceAPI,
  ) {}

  private formatWorkspaceUser(
    workspaceUser: WorkspaceUser,
    currentCompanyId: uuid,
    user: User,
    userCompanies: CompanyUser[],
    companiesMap: Map<string, Company>,
  ): WorkspaceUserObject {
    const res: WorkspaceUserObject = {
      id: workspaceUser.id,
      company_id: currentCompanyId,
      user_id: workspaceUser.userId,
      workspace_id: workspaceUser.workspaceId,
      created_at: workspaceUser.dateAdded,
      role: workspaceUser.role,
      user: {
        id: user.id,
        provider: user.identity_provider,
        provider_id: user.identity_provider_id,
        email: user.email_canonical,
        is_verified: Boolean(user.mail_verified),
        picture: user.picture,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.creation_date,
        deleted: Boolean(user.deleted),
        status: user.status_icon,
        last_activity: user.last_activity,
        companies: userCompanies.map(cu => {
          const company = companiesMap.get(cu.group_id);
          return {
            role: cu.role as CompanyUserRole,
            status: "active" as CompanyUserStatus, // FIXME: with real status
            company: {
              id: company.id,
              name: company.name,
              logo: company.logo,
            } as CompanyShort,
          };
        }),
      },
    };

    return res;
  }

  private async getCompaniesMap(companyUsers: CompanyUser[]) {
    const companiesMap: Map<string, Company> = new Map(
      (
        await Promise.all(
          chain(companyUsers)
            .map("group_id")
            .uniq()
            .value()
            .map(companyId => this.companyService.getCompany({ id: companyId })),
        )
      ).map(c => [c.id, c]),
    );
    return companiesMap;
  }

  async list(
    request: FastifyRequest<{ Params: WorkspaceUsersBaseRequest }>,
    reply: FastifyReply,
  ): Promise<ResourceListResponse<WorkspaceUserObject>> {
    const context = getExecutionContext(request);

    const allWorkspaceUsers = await this.workspaceService
      .getUsers({
        workspaceId: context.workspace_id,
      })
      .then(a => a.getEntities());

    const allUsersMap = new Map(
      (
        await Promise.all(allWorkspaceUsers.map(wu => this.usersService.get({ id: wu.userId })))
      ).map(user => [user.id, user]),
    );

    const allCompanyUsers: CompanyUser[] = [].concat(
      ...(await Promise.all(
        allWorkspaceUsers.map(wu =>
          this.usersService.getUserCompanies({ id: wu.userId }).then(a => a.getEntities()),
        ),
      )),
    );

    const companyUsersMap = new Map<string, Set<CompanyUser>>();

    for (const companyUser of allCompanyUsers) {
      if (!companyUsersMap.has(companyUser.user_id)) {
        companyUsersMap.set(companyUser.user_id, new Set());
      }
      companyUsersMap.get(companyUser.user_id).add(companyUser);
    }

    const companiesMap = await this.getCompaniesMap(allCompanyUsers);

    const resources = allWorkspaceUsers.map(async wu =>
      this.formatWorkspaceUser(
        wu,
        context.company_id,
        allUsersMap.get(wu.userId),
        Array.from(companyUsersMap.get(wu.userId)),
        companiesMap,
      ),
    );

    return {
      resources: await Promise.all(resources),
    };
  }

  private async getForOne(
    userId: uuid,
    context: WorkspaceUsersExecutionContext,
  ): Promise<WorkspaceUserObject> {
    const workspaceUser = await this.workspaceService.getUser({
      workspaceId: context.workspace_id,
      userId: userId,
    });

    const user = await this.usersService.get({ id: userId });

    const userCompanies: CompanyUser[] = await this.usersService
      .getUserCompanies({ id: userId })
      .then(a => a.getEntities());

    const companiesMap = await this.getCompaniesMap(userCompanies);

    return this.formatWorkspaceUser(
      workspaceUser,
      context.company_id,
      user,
      userCompanies,
      companiesMap,
    );
  }

  async get(
    request: FastifyRequest<{ Params: WorkspaceUsersRequest }>,
    reply: FastifyReply,
  ): Promise<ResourceGetResponse<WorkspaceUserObject>> {
    const context = getExecutionContext(request);

    const resource = await this.getForOne(context.user.id, context);

    return {
      resource,
    };
  }

  async save(
    request: FastifyRequest<{ Body: WorkspaceUsersAddBody; Params: WorkspaceUsersRequest }>,
    reply: FastifyReply,
  ): Promise<ResourceGetResponse<WorkspaceUserObject>> {
    const context = getExecutionContext(request);
    const userId = request.params.user_id || request.body.resource.user_id;
    const role = request.body.resource.role;

    const companyUser = await this.companyService.getCompanyUser(
      { id: context.company_id },
      { id: userId },
    );

    if (!companyUser) {
      reply.badRequest(`User ${userId} does not belong to this company`);
      return;
    }

    const workspaceUser = await this.workspaceService.getUser({
      workspaceId: context.workspace_id,
      userId: userId,
    });

    if (request.params.user_id) {
      // ON UPDATE
      if (!workspaceUser) {
        reply.notFound(`User ${userId} not found in this workspace`);
        return;
      }

      await this.workspaceService.updateUserRole(
        { workspaceId: context.workspace_id, userId },
        role,
      );
    } else {
      // ON ADD
      if (!workspaceUser) {
        await this.workspaceService.addUser({ id: context.workspace_id }, { id: userId }, role);
      }
    }

    const resource = await this.getForOne(userId, context);

    reply.status(201);

    return {
      resource: resource,
    };
  }
  async delete(
    request: FastifyRequest<{ Params: WorkspaceUsersRequest }>,
    reply: FastifyReply,
  ): Promise<ResourceDeleteResponse> {
    reply.status(501);
    throw Error("Not implemented");
  }

  async invite(
    request: FastifyRequest<{ Params: WorkspaceUsersInvitationRequest }>,
    reply: FastifyReply,
  ): Promise<WorkspaceUserInvitationResponse> {
    reply.status(501);
    throw Error("Not implemented");
  }
}

function getExecutionContext(
  request: FastifyRequest<{ Params: WorkspaceUsersBaseRequest }>,
): WorkspaceUsersExecutionContext {
  return {
    user: request.currentUser,
    company_id: request.params.company_id,
    workspace_id: request.params.workspace_id,
    url: request.url,
    method: request.routerMethod,
    transport: "http",
  };
}
