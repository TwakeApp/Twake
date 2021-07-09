import { PreviewServiceAPI } from "./api";
import web from "./web/index";
import { FastifyInstance } from "fastify";
import { getService } from "./services";

export default class PreviewService {
  version: 1;
  names: "preview";
  service: PreviewServiceAPI;

  api(): PreviewServiceAPI {
    return this.service;
  }

  public async init(fastify: FastifyInstance): Promise<this> {
    this.service = getService();
    fastify.register((instance, _opts, next) => {
      web(instance, { prefix: "/", service: this.service });
      next();
    });
    return this;
  }
}
