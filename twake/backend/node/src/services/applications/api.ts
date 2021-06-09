import { TwakeServiceProvider, Initializable } from "../../core/platform/framework/api";

export type UploadOptions = {
  applicationname: string;
  type: string;
  totalSize: number;
  totalChunks: number;
  chunkNumber: number;
};

export interface ApplicationServiceAPI extends TwakeServiceProvider, Initializable {}
