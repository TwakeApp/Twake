import * as mongo from "mongodb";
import { Paginable, Pagination } from "../../../../../platform/framework/api/crud-service";
import { AbstractConnector } from "./abstract-connector";

export interface MongoConnectionOptions {
  // TODO: More options
  uri: string;

  database: string;
}

export class MongoConnector extends AbstractConnector<MongoConnectionOptions, mongo.MongoClient> {
  private client: mongo.MongoClient;

  async connect(): Promise<this> {
    if (this.client && this.client.isConnected) {
      return this;
    }

    this.client = await mongo.connect(this.options.uri);

    return this;
  }

  getClient(): mongo.MongoClient {
    return this.client;
  }

  getDatabase(): mongo.Db {
    return this.client.db(this.options.database);
  }
}

export class MongoPagination extends Pagination {
  limit = 100;
  skip = 0;
  page = 1;

  private constructor(readonly page_token = "1", readonly max_results = "100") {
    super(page_token, max_results);
    this.limit = Number.parseInt(max_results, 10);
    this.page = Number.parseInt(page_token, 10);
    this.skip = (this.page - 1) * this.limit;
  }

  static from(pagination: Paginable): MongoPagination {
    return new MongoPagination(pagination.page_token, pagination.max_results);
  }

  static next(current: MongoPagination, items: Array<unknown> = []): Paginable {
    const nextToken = items.length === current.limit && (current.page + 1).toString(10);

    return new Pagination(nextToken, current.max_results);
  }
}
