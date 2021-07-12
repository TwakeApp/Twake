import { PaginationQueryParameters } from "../../../utils/types";

export interface UserParams {
  id?: string;
}

export interface CreateUserBody {
  email: string;
  firstname?: string;
  lastname?: string;
}

export interface UserListQueryParameters extends PaginationQueryParameters {
  user_ids?: string;
  include_companies?: boolean;
  search?: string;
  search_company_id?: string;
}

export interface UserParameters {
  /* user id */
  id: string;
}

export interface CompanyParameters {
  /* company id */
  id: string;
}

export interface UsersParameters {
  ids?: string;
  companies?: string;
}

export type CompanyUserRole = "owner" | "admin" | "member" | "guest";
export type CompanyUserStatus = "active" | "deactivated" | "invited";

export interface CompanyShort {
  id: string; //Related to console "code"
  name: string;
  logo: string;
}

export interface CompanyUserObject {
  company: CompanyShort;
  role: CompanyUserRole;
  status: CompanyUserStatus;
}

export interface UserObject {
  id: string;
  provider: string;
  provider_id: string;
  email: string;
  is_verified: boolean;
  picture: string;
  first_name: string;
  last_name: string;
  created_at: number;
  deleted: boolean;
  status: string; //Single string for the status
  last_activity: number;

  //Below is only if this is myself

  preference?: {
    locale: string;
    timezone: number;
  };

  companies?: CompanyUserObject[];
}

export interface CompanyPlanObject {
  name: string;
  limits: {
    members: number;
    guests: number;
    storage: number;
  };
}

export interface CompanyStatsObject {
  created_at: number;
  total_members: number;
  total_guests: number;
}

export interface CompanyObject {
  id: string;
  name: string;
  logo: string;
  plan?: CompanyPlanObject;
  stats?: CompanyStatsObject;
  role?: CompanyUserRole;
  status?: CompanyUserStatus;
}
