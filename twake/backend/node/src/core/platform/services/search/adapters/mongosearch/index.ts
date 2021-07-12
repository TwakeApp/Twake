import _ from "lodash";
import { Db } from "mongodb";
import { logger } from "../../../../framework";
import { DatabaseServiceAPI } from "../../../database/api";
import {
  getEntityDefinition,
  unwrapPrimarykey,
  ColumnDefinition,
  EntityDefinition,
  FindFilter,
  FindOptions,
  EntityTarget,
  IndexedEntity,
  SearchAdapterInterface,
} from "../../api";
import { SearchAdapter } from "../abstract";
import { ListResult, Paginable, Pagination } from "../../../../framework/api/crud-service";

import { MongoConnector } from "../../../database/services/orm/connectors";
import { parsePrimaryKey, stringifyPrimaryKey } from "../utils";
import { buildSearchQuery } from "./search";

const searchPrefix = "search__";

const typeToIndex: { [key: string]: "text" } = {
  encoded_string: "text",
  string: "text",
};

type Operation = {
  index: string;
  id: string;
  action: "remove" | "upsert";
  body?: any;
};
export default class MongoSearch extends SearchAdapter implements SearchAdapterInterface {
  mongodb: Db;
  private name = "MongoSearch";

  constructor(readonly database: DatabaseServiceAPI) {
    super();
  }

  public async connect() {
    const service = this.database.getConnector() as MongoConnector;
    this.mongodb = await service.getDatabase();
  }

  private async createIndex(
    entityDefinition: EntityDefinition,
    columns: { [name: string]: ColumnDefinition },
  ) {
    if (!entityDefinition.options?.search) {
      return;
    }

    const index = this.getIndex(entityDefinition);
    const collection = this.mongodb.collection(`${searchPrefix}${index}`);

    const primaryKey = unwrapPrimarykey(entityDefinition);
    const indexedPk: any = {};
    primaryKey.forEach(key => {
      indexedPk[key] = 1;
    });

    const indexedFields: any = entityDefinition.options.search.mongoMapping || {};
    if (!entityDefinition.options.search.mongoMapping) {
      Object.keys(columns).forEach(c => {
        const def = columns[c];
        if (typeToIndex[def.type]) {
          indexedFields[typeToIndex[def.type]][c] = typeToIndex[def.type];
        }
      });
    }

    //Create one index for each type of indexes ["text"]
    Object.keys(indexedFields).forEach(k => {
      collection.createIndex(indexedFields[k]);
    });
  }

  public async upsert(entities: any[]) {
    entities.forEach(entity => {
      const { entityDefinition, columnsDefinition } = getEntityDefinition(entity);
      const pkColumns = unwrapPrimarykey(entityDefinition);

      this.ensureIndex(entityDefinition, columnsDefinition, this.createIndex.bind(this));

      if (!entityDefinition.options?.search) {
        return;
      }

      if (
        entityDefinition.options.search.shouldUpdate &&
        !entityDefinition.options.search.shouldUpdate(entity)
      ) {
        return;
      }

      if (!entityDefinition.options?.search?.source) {
        logger.info(`Unable to do operation upsert to mongodb search for doc ${entity}`);
        return;
      }

      const body = {
        ..._.pick(entity, ...pkColumns),
        ...entityDefinition.options.search.source(entity),
      };

      const record: Operation = {
        index: this.getIndex(entityDefinition),
        id: stringifyPrimaryKey(entity),
        action: "upsert",
        body,
      };

      logger.info(`Add operation upsert to to mongodb search for doc ${record.id}`);

      this.proceed(record);
    });
  }

  public async remove(entities: any[]) {
    entities.forEach(entity => {
      const { entityDefinition, columnsDefinition } = getEntityDefinition(entity);

      this.ensureIndex(entityDefinition, columnsDefinition, this.createIndex.bind(this));

      if (!entityDefinition.options?.search) {
        return;
      }

      const record: Operation = {
        index: this.getIndex(entityDefinition),
        id: stringifyPrimaryKey(entity),
        action: "remove",
      };

      logger.info(`Add operation remove from to mongodb search for doc ${record.id}`);

      this.proceed(record);
    });
  }

  private getIndex(entityDefinition: EntityDefinition) {
    return entityDefinition.options?.search?.index || entityDefinition.name;
  }

  private async proceed(operation: Operation) {
    const collection = this.mongodb.collection(`${searchPrefix}${operation.index}`);
    if (operation.action === "remove") {
      await collection.deleteOne({ _docId: operation.id });
    }
    if (operation.action === "upsert") {
      await collection.updateOne(
        { _docId: operation.id },
        { $set: { ...{ _docId: operation.id }, ...operation.body } },
        { upsert: true },
      );
    }
  }

  public async search<EntityType>(
    _table: string,
    entityType: EntityTarget<EntityType>,
    filters: FindFilter,
    options: FindOptions = {},
  ) {
    const instance = new (entityType as any)();
    const { entityDefinition } = getEntityDefinition(instance);
    const index = this.getIndex(entityDefinition);

    const collection = this.mongodb.collection(`${searchPrefix}${index}`);

    const { query, sort, project } = buildSearchQuery<EntityType>(entityType, filters, options);

    let cursor = collection.find({ ...query }).sort(sort);
    if (project) {
      cursor = cursor.project(project);
    }
    cursor = cursor
      .skip(Math.max(0, parseInt(options.pagination.page_token || "0")))
      .limit(Math.max(0, parseInt(options.pagination.limitStr || "100")));

    const entities: IndexedEntity[] = [];
    while (await cursor.hasNext()) {
      let row = await cursor.next();
      row = { ...row.set, ...row };
      console.log(row);
      try {
        entities.push({
          primaryKey: parsePrimaryKey(entityDefinition, row._docId),
          score: row.score,
        });
      } catch (err) {
        logger.error(
          `${this.name} failed to get entity from search result: ${JSON.stringify(
            row._docId,
          )}, ${JSON.stringify(err)}`,
        );
      }
    }

    const nextToken =
      entities.length === parseInt(options.pagination.limitStr) &&
      (parseInt(options.pagination.page_token) + 1).toString(10);
    const nextPage: Paginable = new Pagination(nextToken, options.pagination.limitStr || "100");

    return new ListResult(entityDefinition.type, entities, nextPage);
  }
}
