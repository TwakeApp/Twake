import { TwakeService, logger, ServiceName } from "../../framework";
import { DatabaseServiceAPI } from "./api";
import DatabaseService from "./services";
import { DatabaseType } from "./services";
import { ConnectionOptions } from "./services/orm/connectors";

@ServiceName("database")
export default class Database extends TwakeService<DatabaseServiceAPI> {
  version = "1";
  name = "database";
  service: DatabaseService;

  public async doInit(): Promise<this> {
    const driver = this.configuration.get<DatabaseType>("type");

    if (!driver) {
      throw new Error("Database driver name must be specified in 'database.type' contfiguration");
    }

    const configuration: ConnectionOptions = this.configuration.get<ConnectionOptions>(driver);

    this.service = new DatabaseService(driver, configuration);
    const dbConnector = this.service.getConnector();

    try {
      logger.info("Connecting to database");
      await dbConnector.connect();
      await dbConnector.init();
    } catch (err) {
      logger.error("Failed to connect to database", err);
      throw new Error("Failed to connect to db");
    }

    return this;
  }

  api(): DatabaseServiceAPI {
    return this.service;
  }
}
