import UserServiceAPI from "../services/user/api";
import { User, Workspace } from "./types";
import Company from "../services/user/entities/company";
import CompanyUser from "../services/user/entities/company_user";
import WorkspaceUser from "../services/workspaces/entities/workspace_user";

export async function isWorkspaceAdmin(
  userService: UserServiceAPI,
  user?: User,
  workspace?: Workspace,
): Promise<boolean> {
  if (!user || !workspace) {
    return false;
  }

  const workspaceUser = await getWorkspaceUser(userService, user, workspace);

  if (!workspaceUser) {
    return false;
  }

  return workspaceUser.role === "admin";
}

export async function getWorkspaceUser(
  userService: UserServiceAPI,
  user?: User,
  workspace?: Workspace,
): Promise<WorkspaceUser> {
  if (!user || !workspace) {
    return null;
  }

  const workspaceUser = await userService.workspaces.getUser({
    workspaceId: workspace.workspace_id,
    userId: user.id,
  });

  return workspaceUser;
}

export async function getCompanyUser(
  userService: UserServiceAPI,
  user?: User,
  company?: Company,
): Promise<CompanyUser> {
  if (!user || !company) {
    return null;
  }

  const companyUser = await userService.companies.getCompanyUser(
    {
      id: company.id,
    },
    {
      id: user.id,
    },
  );

  return companyUser;
}
