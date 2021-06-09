import { FastifyRequest } from "fastify";
import { CompanyExecutionContext } from "../types";
import { ApplicationServiceAPI } from "../../api";

export class ApplicationController {
  constructor(protected service: ApplicationServiceAPI) {}
}

function getCompanyExecutionContext(
  request: FastifyRequest<{
    Params: { company_id: string };
  }>,
): CompanyExecutionContext {
  return {
    user: request.currentUser,
    company: { id: request.params.company_id },
    url: request.url,
    method: request.routerMethod,
    reqId: request.id,
    transport: "http",
  };
}
