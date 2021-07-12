import axios, { AxiosInstance } from "axios";
import { merge } from "lodash";

import { ConsoleServiceClient } from "../client-interface";
import {
  ConsoleCompany,
  ConsoleHookUser,
  ConsoleOptions,
  ConsoleUser,
  CreateConsoleCompany,
  CreateConsoleUser,
  CreatedConsoleCompany,
  CreatedConsoleUser,
  UpdateConsoleUserRole,
  UpdatedConsoleUserRole,
} from "../types";

import { v1 as uuidv1 } from "uuid";
import { ConsoleServiceAPI } from "../api";
import User, { getInstance as getUserInstance } from "../../user/entities/user";
import Company from "../../user/entities/company";
import { CompanyUserRole } from "../../user/web/types";

export class ConsoleInternalClient implements ConsoleServiceClient {
  version: "1";
  client: AxiosInstance;

  constructor(private consoleInstance: ConsoleServiceAPI) {}

  async addUserToCompany(
    company: ConsoleCompany,
    user: CreateConsoleUser,
  ): Promise<CreatedConsoleUser> {
    await this.consoleInstance.services.userService.companies.setUserRole(
      company.id,
      user.id,
      user.role,
    );
    return merge(user, { _id: user.id });
  }

  async updateUserRole(
    company: ConsoleCompany,
    user: UpdateConsoleUserRole,
  ): Promise<UpdatedConsoleUserRole> {
    throw Error("ConsoleInternalClient.updateUserRole is not implemented");
  }

  async createCompany(company: CreateConsoleCompany): Promise<CreatedConsoleCompany> {
    throw Error("ConsoleInternalClient.createCompany is not implemented");
  }

  addUserToTwake(user: CreateConsoleUser): Promise<User> {
    const userToCreate = getUserInstance({
      id: uuidv1(),
      email_canonical: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      password: user.password,
      creation_date: Date.now(),
    });

    return this.consoleInstance.services.userService.users
      .save(userToCreate)
      .then(result => result.entity);
  }

  updateLocalCompanyFromConsole(code: string): Promise<Company> {
    throw new Error("Method should not be implemented.");
  }

  updateLocalUserFromConsole(
    consoleUserId: string,
    company: Company,
    userDTO: ConsoleHookUser,
  ): Promise<void> {
    throw new Error("Method should not be implemented.");
  }
}
