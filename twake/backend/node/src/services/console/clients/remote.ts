import axios, { AxiosInstance } from "axios";
import { ConsoleServiceClient } from "../client-interface";
import {
  ConsoleCompany,
  ConsoleHookUser,
  ConsoleOptions,
  CreateConsoleCompany,
  CreateConsoleUser,
  CreatedConsoleCompany,
  CreatedConsoleUser,
  UpdateConsoleUserRole,
  UpdatedConsoleUserRole,
} from "../types";

import { v1 as uuidv1 } from "uuid";
import User from "../../user/entities/user";
import { ConsoleServiceAPI } from "../api";
import Company from "../../user/entities/company";
import { CrudExeption } from "../../../core/platform/framework/api/crud-service";
import { memoize } from "lodash";
import UserServiceAPI from "../../user/api";

export class ConsoleRemoteClient implements ConsoleServiceClient {
  version: "1";
  client: AxiosInstance;

  private infos: ConsoleOptions;
  private userService: UserServiceAPI;

  constructor(consoleInstance: ConsoleServiceAPI, private dryRun: boolean) {
    this.infos = consoleInstance.consoleOptions;
    this.client = axios.create({ baseURL: this.infos.url });
    this.userService = consoleInstance.services.userService;
  }

  async addUserToCompany(
    company: ConsoleCompany,
    user: CreateConsoleUser,
  ): Promise<CreatedConsoleUser> {
    if (this.dryRun) {
      return {
        _id: uuidv1(),
      };
    }

    return this.client
      .post(`/api/companies/${company.code}/users`, user, {
        auth: {
          username: this.infos.client,
          password: this.infos.secret,
        },
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          skipInvite: user.skipInvite,
        },
      })
      .then(({ data }) => data);
  }

  async updateUserRole(
    company: ConsoleCompany,
    user: UpdateConsoleUserRole,
  ): Promise<UpdatedConsoleUserRole> {
    if (this.dryRun) {
      return {
        id: user.id,
        role: user.role,
      };
    }

    return this.client
      .put(
        `/api/companies/${company.code}/users/${user.id}`,
        { role: user.role },
        {
          auth: {
            username: this.infos.client,
            password: this.infos.secret,
          },
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      .then(({ data }) => data);
  }

  async createCompany(company: CreateConsoleCompany): Promise<CreatedConsoleCompany> {
    if (this.dryRun) {
      return company;
    }

    return this.client
      .post("/api/companies", company, {
        auth: {
          username: this.infos.client,
          password: this.infos.secret,
        },
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then(({ data }) => data);
  }

  addUserToTwake(user: CreateConsoleUser): Promise<User> {
    //should do noting for real console
    return Promise.resolve(undefined);
  }

  async updateLocalCompanyFromConsole(code: string): Promise<Company> {
    const company = await this.userService.companies.getCompanyByCode(code);
    if (!company) throw CrudExeption.notFound(`Company code ${code} not found`);

    // this.client
    //   .get(`/api/companies/${code}`, {
    //     auth: {
    //       username: this.infos.client,
    //       password: this.infos.secret,
    //     },
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //   })
    //   .then(({ data }) => data);

    // ToDo: implement fetch data
    return company;
  }

  async updateLocalUserFromConsole(
    consoleUserId: string,
    company: Company,
    userDTO: ConsoleHookUser,
  ): Promise<void> {
    const roles = userDTO.roles;

    let user = await this.userService.users.getByConsoleId(userDTO._id);

    if (!user) {
      if (!userDTO.email) {
        throw CrudExeption.badRequest("Email is required");
      }

      let username = userDTO.email
        .split("@")[0]
        .toLocaleLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/ +/g, "_");

      if (await this.userService.users.isEmailAlreadyInUse(userDTO.email)) {
        throw CrudExeption.badRequest("Console user not created because email already exists");
      }

      username = await this.userService.users.getAvailableUsername(username);
      if (!username) {
        throw CrudExeption.badRequest("Console user not created because username already exists");
      }

      user = new User();
      user.username_canonical = username;
      user.email_canonical = userDTO.email;
      user.deleted = false;
    }

    user.email_canonical = userDTO.email;
    user.phone = "";
    user.first_name = userDTO.firstName ? userDTO.firstName : userDTO.name;
    user.last_name = userDTO.lastName;
    user.identity_provider = "console";
    user.identity_provider_id = userDTO._id;
    user.mail_verified = userDTO.isVerified;
    user.language = userDTO.preference.locale;
    user.timezone = userDTO.preference.timeZone;

    const avatar = userDTO.avatar;

    const endpoint = this.infos.url;

    user.picture =
      avatar.type && avatar.type !== "url"
        ? endpoint.replace(/\/$/, "") + "/avatars/" + avatar.value
        : "";

    await this.userService.users.save(user);

    // const companiesHash: Map<string, Company> = new Map();

    const getCompanyByCode = memoize(companyCode =>
      this.userService.companies.getCompanyByCode(companyCode),
    );

    if (userDTO.roles) {
      for (const role of roles) {
        const companyConsoleCode = role.targetCode;
        const roleName = role.roleCode;
        company = await getCompanyByCode(companyConsoleCode);
        if (!company) {
          throw CrudExeption.notFound(`Company ${companyConsoleCode} not found`);
        }
        await this.userService.companies.setUserRole(company.id, user.id, roleName);
        // await services.companies.setUserRole(company.id, user.id, roleName);
      }
    }
  }

  async removeCompanyUser(consoleUserId: string, company: Company): Promise<void> {
    const user = await this.userService.users.getByConsoleId(consoleUserId);
    if (!user) {
      throw CrudExeption.notFound(`User ${consoleUserId} doesn't exists`);
    }
    await this.userService.companies.removeUserFromCompany({ id: company.id }, { id: user.id });
  }
}
