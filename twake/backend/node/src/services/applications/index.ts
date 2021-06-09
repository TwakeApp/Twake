import WebServerAPI from "../../core/platform/services/webserver/provider";
import { TwakeService, Prefix, Consumes } from "../../core/platform/framework";
import { DatabaseServiceAPI } from "../../core/platform/services/database/api";
import { PubsubServiceAPI } from "../../core/platform/services/pubsub/api";
import StorageAPI from "../../core/platform/services/storage/provider";
import { ApplicationServiceAPI } from "./api";
import { getService } from "./services/index";
import web from "./web/index";

@Prefix("/internal/services/applications/v1")
@Consumes(["webserver", "database", "storage", "pubsub"])
export default class ApplicationsService extends TwakeService<ApplicationServiceAPI> {
  version = "1";
  name = "applications";
  service: ApplicationServiceAPI;

  api(): ApplicationServiceAPI {
    return this.service;
  }

  public async doInit(): Promise<this> {
    const fastify = this.context.getProvider<WebServerAPI>("webserver").getServer();
    const database = this.context.getProvider<DatabaseServiceAPI>("database");
    const storage = this.context.getProvider<StorageAPI>("storage");
    const pubsub = this.context.getProvider<PubsubServiceAPI>("pubsub");

    this.service = getService(database, pubsub, storage);
    await this.service?.init(this.context);

    fastify.register((instance, _opts, next) => {
      web(instance, { prefix: this.prefix, service: this.service });
      next();
    });

    return this;
  }
}
