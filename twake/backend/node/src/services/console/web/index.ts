import { FastifyInstance, FastifyRegisterOptions } from "fastify";
import { ConsoleServiceAPI } from "../api";
import routes from "./routes";

export default (
  fastify: FastifyInstance,
  options: FastifyRegisterOptions<{ prefix: string; service: ConsoleServiceAPI }>,
): void => {
  fastify.log.debug("Configuring /console routes");
  fastify.register(routes, options);
};
