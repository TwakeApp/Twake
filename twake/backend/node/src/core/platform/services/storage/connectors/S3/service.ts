import * as Minio from "minio";
import { Readable } from "stream";
import { StorageConnectorAPI } from "../../provider";

export type S3Configuration = Minio.ClientOptions & { bucket: string };

export default class S3ConnectorService implements StorageConnectorAPI {
  client: Minio.Client;
  minioConfiguration: S3Configuration;

  constructor(S3Configuration: S3Configuration) {
    this.client = new Minio.Client({ ...S3Configuration });
    this.minioConfiguration = S3Configuration;
  }

  write(path: string, stream: Readable): void {
    this.client.putObject(this.minioConfiguration.bucket, path, stream);
  }

  async read(path: string): Promise<Readable> {
    return this.client.getObject(this.minioConfiguration.bucket, path);
  }
}
