import { FastifyRequest, FastifyReply } from "fastify";
import { PreviewServiceAPI } from "../../api";

export class PreviewController {
  constructor(protected service: PreviewServiceAPI) {}

  async get(
    request: FastifyRequest<{ Params: { id: string } }>,
    response: FastifyReply
  ): Promise<any> {
    const inputPath =
      "/Users/t_issarni/twake/Twake/twake/backend/preview/test_temp.pdf";
    const mime = "pdf";
    const outputPath = `${inputPath.split(".")[0]}_temp`;
    const numberOfPages = 1;
    const result = await this.service.get(
      mime,
      inputPath,
      outputPath,
      numberOfPages
    );
    response.send("computing");
  }
}
