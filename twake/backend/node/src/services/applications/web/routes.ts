import { FastifyInstance, FastifyPluginCallback } from "fastify";
import { ApplicationServiceAPI } from "../api";
import { ApplicationController } from "./controllers/applications";

const applicationsUrl = "/companies/:company_id/applications";

const routes: FastifyPluginCallback<{ service: ApplicationServiceAPI }> = (
  fastify: FastifyInstance,
  options,
  next,
) => {
  const applicationController = new ApplicationController(options.service);

  next();
};

export default routes;
