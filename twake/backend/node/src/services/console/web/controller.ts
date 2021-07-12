import { ConsoleServiceAPI } from "../api";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  ConsoleExecutionContext,
  ConsoleHookBody,
  ConsoleHookBodyContent,
  ConsoleHookResponse,
} from "../types";
import Company from "../../user/entities/company";
import { CrudExeption } from "../../../core/platform/framework/api/crud-service";

export class ConsoleController {
  constructor(protected consoleService: ConsoleServiceAPI) {}

  private async updateCompany(content: ConsoleHookBodyContent): Promise<Company> {
    if (!content.company || !content.company.code) {
      throw CrudExeption.badRequest("Company is required");
    }
    const company = await this.updateCompanyIfExists(content);
    if (!company) {
      throw CrudExeption.badRequest(`Company ${content.company.code} not found`);
    }
    return company;
  }

  private async updateCompanyIfExists(content: ConsoleHookBodyContent): Promise<Company> {
    if (content.company && content.company.code) {
      return this.consoleService.getClient().updateLocalCompanyFromConsole(content.company.code);
    }
    return Promise.resolve(null);
  }

  async hook(
    request: FastifyRequest<{ Body: ConsoleHookBody }>,
    reply: FastifyReply,
  ): Promise<ConsoleHookResponse> {
    try {
      const context = getExecutionContext(request, this.consoleService);

      switch (request.body.type) {
        case "company_user_added":
        case "company_user_activated":
        case "company_user_updated":
          await this.userAdded(request.body.content);
          break;
        case "company_user_deactivated":
          await this.userRemoved(request.body.content);
          break;
        case "user_updated":
          await this.userUpdated(request.body.content);
          break;
        case "plan_updated":
          await this.planUpdated(request.body.content);
          break;
        case "company_deleted":
          await this.companyRemoved(request.body.content);
          break;
        case "company_created":
        case "company_updated":
          await this.companyUpdated(request.body.content);
          break;
        default:
          reply.notImplemented("Unimplemented");
          return;
      }
    } catch (e) {
      console.log(e);
      reply.status(400);
      return {
        error: e.message,
      };
    }

    return {
      success: true,
    };
  }

  private async userAdded(content: ConsoleHookBodyContent): Promise<void> {
    const company = await this.updateCompanyIfExists(content);
    await this.consoleService
      .getClient()
      .updateLocalUserFromConsole(content.user._id, company, content.user);
  }

  private async userRemoved(content: ConsoleHookBodyContent): Promise<void> {
    const company = await this.updateCompany(content);
    await this.consoleService.getClient().removeCompanyUser(content.user._id, company);
    // return new Response($service->removeUser($data["user"]["_id"], $data["company"]["code"] ?: null) ?: "");
  }

  private async userUpdated(content: ConsoleHookBodyContent) {
    // return new Response($service->updateUser($data["user"]["_id"], $data["company"]["code"] ?: null, $data["user"]) ?: "");
  }

  private async companyRemoved(content: ConsoleHookBodyContent) {
    // return new Response($service->removeCompany($data["company"]["code"]) ?: "");
  }

  private async companyUpdated(content: ConsoleHookBodyContent) {
    await this.updateCompany(content);
  }

  private async planUpdated(content: ConsoleHookBodyContent) {
    await this.updateCompany(content);
  }
}

function getExecutionContext(
  request: FastifyRequest<{ Body: ConsoleHookBody }>,
  service: ConsoleServiceAPI,
): ConsoleExecutionContext {
  return {
    user: request.currentUser,
    url: request.url,
    method: request.routerMethod,
    transport: "http",
    options: service.consoleOptions,
  };
}
