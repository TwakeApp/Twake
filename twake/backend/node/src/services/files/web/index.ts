import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { FileServiceAPI } from "../api";
import routes from "./routes";

export default (
  fastify: FastifyInstance,
  options: FastifyRegisterOptions<{ prefix: string; service: FileServiceAPI }>,
): void => {
  fastify.log.debug("Configuring /internal/services/files/v1 routes");
  fastify.register(routes, options);
};
