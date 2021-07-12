import { TwakeServiceProvider } from "../../framework";
import { ListResult, Pagination } from "../../framework/api/crud-service";
import {
  FindFilter as ormFindFilter,
  FindOptions as ormFindOptions,
} from "../database/services/orm/repository/repository";
import { EntityTarget } from "../database/services/orm/types";
import SearchRepository from "./repository";
export { getEntityDefinition, unwrapPrimarykey } from "../database/services/orm/utils";
export {
  DatabaseEntitiesRemovedEvent,
  DatabaseEntitiesSavedEvent,
  EntityDefinition,
  ColumnDefinition,
  EntityTarget,
} from "../database/services/orm/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FindFilter = ormFindFilter;

type TextType = {
  $search: string;
  $caseSensitive?: boolean; //Default false
  $diacriticSensitive?: boolean; //Default false
};

//Field, regex, options
type RegexType = [string, string, string];

export type FindOptions = ormFindOptions & {
  $regex?: RegexType[];
  $text?: TextType;
};

export type IndexedEntity = {
  primaryKey: { [key: string]: any };
  score: number;
};

export interface SearchAdapterInterface {
  connect(): Promise<void>;
  upsert(entities: any[]): Promise<void>;
  remove(entities: any[]): Promise<void>;

  search<Entity>(
    table: string,
    entityType: EntityTarget<Entity>,
    filters: FindFilter,
    options: FindOptions,
  ): Promise<ListResult<IndexedEntity>>;
}

export interface SearchServiceAPI extends TwakeServiceProvider {
  getRepository<Entity>(table: string, entityType: EntityTarget<Entity>): SearchRepository<Entity>;
}

export type SearchConfiguration = {
  type?: false | "elasticsearch";
  elasticsearch?: {
    endpoint: string;
    flushInterval: number; //In milliseconds
  };
};
