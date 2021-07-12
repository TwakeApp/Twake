import WebServerAPI from "../../core/platform/services/webserver/provider";
import { Consumes, Prefix, TwakeService } from "../../core/platform/framework";
import UserServiceAPI from "./api";
import web from "./web/index";
import { getService } from "./services";
import { DatabaseServiceAPI } from "../../core/platform/services/database/api";

@Prefix("/internal/services/users/v1")
@Consumes(["webserver", "database"])
export default class UserService extends TwakeService<UserServiceAPI> {
  version = "1";
  name = "user";
  private service: UserServiceAPI;

  public async doInit(): Promise<this> {
    const fastify = this.context.getProvider<WebServerAPI>("webserver").getServer();
    const database = this.context.getProvider<DatabaseServiceAPI>("database");

    this.service = getService(database);
    await this.service?.init(this.context);

    fastify.register((instance, _opts, next) => {
      web(instance, { prefix: this.prefix, service: this.service });
      next();
    });

    return this;
  }

  api(): UserServiceAPI {
    return this.service;
  }
}
