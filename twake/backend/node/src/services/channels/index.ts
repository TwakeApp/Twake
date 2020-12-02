import WebServerAPI from "../../core/platform/services/webserver/provider";
import { TwakeService, Prefix, Consumes } from "../../core/platform/framework";
import ChannelServiceAPI from "./provider";
import { getService } from "./services";
import web from "./web/index";
import { DatabaseServiceAPI } from "../../core/platform/services/database/api";
import PhpNodeAPI from "../../core/platform/services/phpnode/provider";
import { ChannelMemberCrudController } from "./web/controllers";
import { FastifyRequest } from "fastify";
import { ChannelMemberParameters } from "./web/types";

@Prefix("/internal/services/channels/v1")
@Consumes(["webserver", "phpnode", "database"])
export default class ChannelService extends TwakeService<ChannelServiceAPI> {
  version = "1";
  name = "channels";
  service: ChannelServiceAPI;

  api(): ChannelServiceAPI {
    return this.service;
  }

  public async doInit(): Promise<this> {
    const phpnode = this.context.getProvider<PhpNodeAPI>("phpnode");
    const fastify = this.context.getProvider<WebServerAPI>("webserver").getServer();
    const database = this.context.getProvider<DatabaseServiceAPI>("database");

    this.service = getService(database);
    this.service.init && (await this.service.init());

    fastify.register((instance, _opts, next) => {
      web(instance, { prefix: this.prefix, service: this.service });
      next();
    });

    phpnode.register({
      method: "GET",
      url: "/companies/:company_id/workspaces/:workspace_id/channels/:id/members/:member_id",
      handler: (request: FastifyRequest<{ Params: ChannelMemberParameters }>, reply) => {
        const membersController = new ChannelMemberCrudController(this.service.members);
        membersController.exists(request, reply);
      },
    });

    return this;
  }
}
