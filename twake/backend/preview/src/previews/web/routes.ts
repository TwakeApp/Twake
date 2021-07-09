import { FastifyInstance, FastifyPluginCallback } from "fastify";
import { PreviewServiceAPI } from "../api";
import { PreviewController } from "./controllers/previews";

const previewsUrl = "/previews";

const routes: FastifyPluginCallback<{ service: PreviewServiceAPI }> = (
  fastify: FastifyInstance,
  options,
  next
) => {
  const previewController = new PreviewController(options.service);

  fastify.route({
    method: "GET",
    url: `${previewsUrl}`, ///:id`,
    preValidation: [], //[fastify.authenticate],
    handler: previewController.get.bind(previewController),
  });

  next();
};

export default routes;
