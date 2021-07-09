import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { PreviewServiceAPI } from "../api";
import routes from "./routes";

export default (
  fastify: FastifyInstance,
  options: FastifyRegisterOptions<{
    prefix: string;
    service: PreviewServiceAPI;
  }>
) => {
  fastify.log.info("Configuring /preview");
  fastify.log.debug("Configuring / routes");
  fastify.register(routes, options);
};
