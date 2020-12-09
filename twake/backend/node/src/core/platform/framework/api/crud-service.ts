import User from "../../../../services/user/entity/user";

export class ContextualizedTarget {
  context?: ExecutionContext;
  readonly operation: OperationType;
}

export class EntityTarget<Entity> extends ContextualizedTarget {
  /**
   *
   * @param type type of entity
   * @param entity the entity itself
   */
  constructor(readonly type: string, readonly entity: Entity) {
    super();
  }
}

export class UpdateResult<Entity> extends EntityTarget<Entity> {
  readonly operation = OperationType.UPDATE;

  /**
   * Result sent back by the underlying database
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: any;

  /**
   * Number of rows affected by the update.
   */
  affected?: number;
}

export class CreateResult<Entity> extends EntityTarget<Entity> {
  readonly operation = OperationType.CREATE;

  /**
   * Result sent back by the underlying database
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: any;
}

export class SaveResult<Entity> extends EntityTarget<Entity> {
  /**
   * Result sent back by the underlying database
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: any;

  /**
   *
   * @param type Type of entity
   * @param entity The entity itself
   * @param operation Save can be for a "create", an "update" or "exists" when resource already exists
   */
  constructor(
    readonly type: string,
    readonly entity: Entity,
    readonly operation: OperationType.UPDATE | OperationType.CREATE | OperationType.EXISTS,
  ) {
    super(type, entity);
  }
}

export class DeleteResult<Entity> extends EntityTarget<Entity> {
  readonly operation = OperationType.DELETE;

  /**
   *
   * @param type type of entity
   * @param entity the entity itself
   * @param deleted the entity has been deleted or not
   */
  constructor(readonly type: string, readonly entity: Entity, readonly deleted: boolean) {
    super(type, entity);
  }
}

export class ListResult<Entity> extends ContextualizedTarget implements Paginable {
  // next page token
  page_token: string;

  constructor(readonly type: string, protected entities: Entity[], nextPage?: Paginable) {
    super();
    this.page_token = nextPage?.page_token;
  }

  mapEntities(mapper: <T extends Entity>(entity: Entity) => T): void {
    this.entities = this.entities.map(entity => mapper(entity));
  }

  getEntities(): Entity[] {
    return this.entities || [];
  }
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  SAVE = "save",
  DELETE = "delete",
  EXISTS = "exists",
}

export declare type EntityOperationResult<Entity> =
  | CreateResult<Entity>
  | UpdateResult<Entity>
  | SaveResult<Entity>
  | DeleteResult<Entity>;

export interface ExecutionContext {
  user: User;
  url?: string;
  method?: string;
  transport?: "http" | "ws";
}

export class CrudExeption extends Error {
  constructor(readonly details: string, readonly status: number) {
    super();
    this.message = details;
  }

  static badRequest(details: string): CrudExeption {
    return new CrudExeption(details, 400);
  }

  static notFound(details: string): CrudExeption {
    return new CrudExeption(details, 404);
  }
}

export interface Paginable {
  page_token?: string;
  limitStr?: string;
}

export class Pagination implements Paginable {
  constructor(readonly page_token: string, readonly limitStr = "100") {}
}

export interface CRUDService<Entity, PrimaryKey, Context extends ExecutionContext> {
  /**
   * Creates a resource
   *
   * @param item
   * @param context
   */
  create?(item: Entity, context?: Context): Promise<CreateResult<Entity>>;

  /**
   * Get a resource
   *
   * @param pk
   * @param context
   */
  get(pk: PrimaryKey, context?: Context): Promise<Entity>;

  /**
   * Update a resource
   *
   * @param pk
   * @param item
   * @param context
   */
  update?(
    pk: PrimaryKey,
    item: Entity,
    context?: Context /* TODO: Options */,
  ): Promise<UpdateResult<Entity>>;

  /**
   * Save a resource.
   * If the resource exists, it is updated, if it does not exists, it is created.
   *
   * @param item
   * @param context
   */
  save?<SaveOptions>(
    item: Entity,
    options?: SaveOptions,
    context?: Context,
  ): Promise<SaveResult<Entity>>;

  /**
   * Delete a resource
   *
   * @param pk
   * @param context
   */
  delete(pk: PrimaryKey, context?: Context): Promise<DeleteResult<Entity>>;

  /**
   * List a resource
   *
   * @param context
   */
  list<ListOptions>(
    pagination: Paginable,
    options?: ListOptions,
    context?: Context /* TODO: Options */,
  ): Promise<ListResult<Entity>>;
}
