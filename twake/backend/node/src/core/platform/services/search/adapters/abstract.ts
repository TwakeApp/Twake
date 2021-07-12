import { ListResult } from "../../../framework/api/crud-service";
import { FindFilter } from "../../database/services/orm/repository/repository";
import {
  ColumnDefinition,
  EntityDefinition,
  EntityTarget,
  FindOptions,
  IndexedEntity,
  SearchAdapterInterface,
} from "../api";

export class SearchAdapter implements SearchAdapterInterface {
  private createdIndexes: string[] = [];

  protected ensureIndex(
    entityDefinition: EntityDefinition,
    columns: { [name: string]: ColumnDefinition },
    createIndex: Function,
  ) {
    const index = entityDefinition.name;
    if (!this.createdIndexes.includes(index)) {
      this.createdIndexes.push(index);
      createIndex(entityDefinition, columns);
    }
  }

  connect(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  upsert(entities: any[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
  remove(entities: any[]): Promise<void> {
    throw new Error("Method not implemented.");
  }
  search<Entity>(
    table: string,
    entityType: EntityTarget<Entity>,
    filters: FindFilter,
    options: FindOptions,
  ): Promise<ListResult<IndexedEntity>> {
    throw new Error("Method not implemented.");
  }
}
