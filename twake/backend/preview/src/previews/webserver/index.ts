import { Server, IncomingMessage, ServerResponse } from "http";
import * as fastify from "fastify";

export const server: fastify.FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse
> = fastify.fastify({
  logger: true,
});
