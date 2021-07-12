import { Observable } from "rxjs";
import Company from "../user/entities/company";
import CompanyUser from "../user/entities/company_user";
import { CompanyUserRole } from "../user/web/types";
import { ExecutionContext } from "../../core/platform/framework/api/crud-service";

export interface CreateConsoleCompany {
  code: string;
  displayName: string;
  avatar: {
    type: "url";
    value: string;
  };
  country?: string;
  address?: string;
  logo?: string;
  status: string;
  domain?: string[];
  applications?: string[];
  planId?: string;
  limits?: {
    members: number;
    guests: number;
    storage: number;
  };
}

export type CreatedConsoleCompany = Partial<CreateConsoleCompany>;

export interface CreateConsoleUser {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  avatar: {
    type: "url";
    value: string;
  };
  password: string;
  role: CompanyUserRole;
  skipInvite: boolean;
}

export interface CreateInternalUser {
  email: string;
  password: string;
}

export type CreatedConsoleUser = Partial<CreateConsoleUser> & { _id: string };

export type UpdateConsoleUserRole = Pick<CreateConsoleUser, "role"> & { id: string };

export type UpdatedConsoleUserRole = UpdateConsoleUserRole;

export type ConsoleUser = {
  id: string;
  companyCode: string;
};

export type ConsoleCompany = {
  id?: string;
  code: string;
};

export type CompanyCreatedStreamObject = {
  source: Company;
  destination: ConsoleCompany;
  // Creation error
  error?: Error;
};

export type UserCreatedStreamObject = {
  source: {
    user: CompanyUser;
    company: Company;
  };
  destination: ConsoleUser;
  // Creation error
  error?: Error;
};

type ReportStatus = "success" | "failure";

export type CompanyReport = {
  sourceId: string;
  destinationCode: string;
  status: ReportStatus;
  company: CompanyCreatedStreamObject;
  error?: Error;
};

export type UserReport = {
  sourceId: string;
  destinationId: string;
  destinationCompanyCode: string;
  status: ReportStatus;
  user: UserCreatedStreamObject;
  error?: Error;
};

export type MergeProgress = Observable<ProcessReport>;

export type ProcessReport = {
  type:
    | "user:updated"
    | "user:updating"
    | "user:created"
    | "user:error"
    | "company:created"
    | "processing:owner"
    | "log"
    | "company:withoutadmin";
  //error?: Error;
  message?: string;
  data?: UserReport | CompanyReport | Error | Company[];
};

export type ConsoleType = "remote" | "internal";

export type ConsoleOptions = {
  provider?: string;
  client: string;
  secret: string;
  url: string;
  public_key?: string;
};

export type ConsoleHookUser = {
  _id: string;
  roles: [{ targetCode: string; roleCode: CompanyUserRole }];
  email: string;
  name: string; // backward compatible?
  firstName: string;
  lastName: string;
  isVerified: boolean;
  preference: {
    locale: string;
    timeZone: number;
  };
  avatar: {
    type: string;
    value: string;
  };
};

export type ConsoleHookBodyContent = {
  company: { code: string };
  user: ConsoleHookUser;
};

export type ConsoleHookBody = {
  type: string;
  content: ConsoleHookBodyContent;
  signature: string;
};

export class ConsoleHookQueryString {
  secret: string;
}

export class ConsoleHookResponse {
  success?: boolean;
  error?: string;
}

export interface ConsoleExecutionContext extends ExecutionContext {
  options: ConsoleOptions;
}
