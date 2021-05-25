/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  SaveResult,
  DeleteResult,
  ListResult,
  CreateResult,
  ExecutionContext,
  UpdateResult,
  Pagination,
  OperationType,
} from "../../../../core/platform/framework/api/crud-service";
import { DatabaseServiceAPI } from "../../../../core/platform/services/database/api";
import Repository, {
  FindFilter,
  FindOptions,
} from "../../../../core/platform/services/database/services/orm/repository/repository";
import User, { UserPrimaryKey } from "../../entities/user";
import { UsersServiceAPI } from "../../api";
import { ListUserOptions } from "./types";
import CompanyUser from "../../entities/company_user";

export class UserService implements UsersServiceAPI {
  version: "1";
  repository: Repository<User>;
  companyUserRepository: Repository<CompanyUser>;

  constructor(private database: DatabaseServiceAPI) {}

  async init(): Promise<this> {
    this.repository = await this.database.getRepository<User>("user", User);
    this.companyUserRepository = await this.database.getRepository<CompanyUser>(
      "group_user",
      CompanyUser,
    );

    return this;
  }

  async create(user: User): Promise<CreateResult<User>> {
    this.repository.save(user);

    return new CreateResult("user", user);
  }

  update(pk: Partial<User>, item: User, context?: ExecutionContext): Promise<UpdateResult<User>> {
    throw new Error("Method not implemented.");
  }

  async save<SaveOptions>(
    item: User,
    options?: SaveOptions,
    context?: ExecutionContext,
  ): Promise<SaveResult<User>> {
    await this.repository.save(item);

    return new SaveResult("user", item, OperationType.UPDATE);
  }

  async delete(pk: Partial<User>, context?: ExecutionContext): Promise<DeleteResult<User>> {
    const instance = await this.repository.findOne(pk);
    if (instance) await this.repository.remove(instance);
    return new DeleteResult<User>("user", instance, !!instance);
  }

  async list(
    pagination: Pagination,
    options?: ListUserOptions,
    context?: ExecutionContext,
  ): Promise<ListResult<User>> {
    const findFilter: FindFilter = {};
    const findOptions: FindOptions = {
      pagination,
    };

    if (options?.userIds) {
      findOptions.$in = [["id", options.userIds]];
    }

    return this.repository.find(findFilter, findOptions);
  }

  async get(pk: UserPrimaryKey): Promise<User> {
    return await this.repository.findOne(pk);
  }

  async getUserCompanies(
    pk: UserPrimaryKey,
    pagination?: Pagination,
  ): Promise<ListResult<CompanyUser>> {
    const findOptions: FindOptions = pagination ? { pagination } : {};
    return await this.companyUserRepository.find({ user_id: pk.id }, findOptions);
  }
}
