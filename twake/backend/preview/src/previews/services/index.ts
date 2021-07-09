import { PreviewServiceAPI } from "../api";
import { generatePreview } from "./image";
import { convertFromOffice } from "./office";
import { convertFromPdf } from "./pdf";

export function getService(): PreviewServiceAPI {
  return getServiceInstance();
}

function getServiceInstance(): PreviewServiceAPI {
  return new Service();
}
class Service implements PreviewServiceAPI {
  version: "1";

  constructor() {}

  async get(
    mime: string,
    inputPath: string,
    outputPath: string,
    numberOfPages: number
  ): Promise<any> {
    if (mime == "office") {
      await convertFromOffice(inputPath, outputPath, numberOfPages);
    }

    if (mime == "pdf") {
      await convertFromPdf(inputPath, outputPath);
    }

    if (mime == "image") {
      generatePreview(inputPath, outputPath);
    }
  }
}
