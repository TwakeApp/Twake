import ORMServiceAPI from "../provider";
import { createConnection, ConnectionOptions, Connection, Repository, EntityTarget, EntityManager } from "typeorm";

export default class ORMService implements ORMServiceAPI {
  version = "1";
  private connection: Connection;

  async connect(configuration: ConnectionOptions): Promise<Connection> {
    this.connection = await createConnection(configuration);

    return this.connection;
  }

  get manager(): EntityManager {
    return this.isMongoDriver()
      ? this.connection.mongoManager
      : this.connection.manager;
  }

  private isMongoDriver(): boolean {
    return this.connection.options.type === "mongodb";
  }
}
