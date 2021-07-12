import {
  ConsoleCompany,
  ConsoleHookUser,
  ConsoleOptions,
  CreateConsoleCompany,
  CreateConsoleUser,
  CreatedConsoleCompany,
  CreatedConsoleUser,
  CreateInternalUser,
  UpdateConsoleUserRole,
  UpdatedConsoleUserRole,
} from "./types";
import User from "../user/entities/user";
import Company from "../user/entities/company";
import { CompanyUserRole } from "../user/web/types";

export interface ConsoleServiceClient {
  /**
   * Create a company
   *
   * @param company
   */
  createCompany(company: CreateConsoleCompany): Promise<CreatedConsoleCompany>;

  /**
   * Add user to company
   *
   * @param company
   * @param user
   */
  addUserToCompany(company: ConsoleCompany, user: CreateConsoleUser): Promise<CreatedConsoleUser>;

  /**
   * Add user to twake in general (for non-console version)
   *
   * @param user
   */
  addUserToTwake(user: CreateInternalUser): Promise<User>;

  /**
   * Update user role
   *
   * @param company
   * @param user
   */
  updateUserRole(
    company: ConsoleCompany,
    user: UpdateConsoleUserRole,
  ): Promise<UpdatedConsoleUserRole>;

  updateLocalCompanyFromConsole(code: string): Promise<Company>;

  updateLocalUserFromConsole(
    consoleUserId: string,
    company: Company,
    userDTO: ConsoleHookUser,
  ): Promise<void>;

  removeCompanyUser(consoleUserId: string, company: Company): Promise<void>;
}
