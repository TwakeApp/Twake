import passwordGenerator from "generate-password";
import { concat, EMPTY, forkJoin, from, Observable, ReplaySubject } from "rxjs";
import {
  count,
  distinct,
  filter,
  groupBy,
  map,
  mergeMap,
  min,
  share,
  tap,
  toArray,
} from "rxjs/operators";
import { getLogger } from "../../../core/platform/framework";
import { Paginable } from "../../../core/platform/framework/api/crud-service";
import Company from "../../user/entities/company";
import User from "../../user/entities/user";
import UserServiceAPI from "../../user/api";
import {
  CompanyCreatedStreamObject,
  CompanyReport,
  ConsoleOptions,
  ConsoleType,
  CreatedConsoleCompany,
  CreatedConsoleUser,
  MergeProgress,
  ProcessReport,
  UpdateConsoleUserRole,
  UserCreatedStreamObject,
  UserReport,
} from "../types";
import { getInstance as getExternalUserInstance } from "../../user/entities/external_user";
import { getInstance as getExternalGroupInstance } from "../../user/entities/external_company";
import CompanyUser from "../../user/entities/company_user";
import { ConsoleRemoteClient } from "../clients/remote";
import { ConsoleServiceClient } from "../client-interface";
import { DatabaseServiceAPI } from "../../../core/platform/services/database/api";
import { CompanyUserRole } from "../../user/web/types";
import { ConsoleServiceAPI } from "../api";
import { getService as getConsoleService } from "../service";

const logger = getLogger("console.process.merge");

export class MergeProcess {
  private client: ConsoleServiceClient;

  constructor(
    private database: DatabaseServiceAPI,
    private userService: UserServiceAPI,
    private dryRun: boolean,
    private consoleId: string = "console",
    private linkExternal: boolean = true,
    consoleClientOptions: ConsoleOptions,
  ) {
    const consoleService = getConsoleService(null, null, "remote", consoleClientOptions);

    this.client = new ConsoleRemoteClient(consoleService, dryRun);
  }

  merge(concurrent: number = 1): MergeProgress {
    const progress$ = new ReplaySubject<ProcessReport>();
    const { users$, companies$ } = this.getStreams(concurrent);

    const owners$ = users$.pipe(
      // get only the admins
      filter(userInCompany => userInCompany.source.user.level.valueOf() === 3),
      // group by company id
      groupBy(userInCompany => userInCompany.source.company.id),
      mergeMap(group =>
        group.pipe(
          // get the admin with the smaller creation date, let's say that this is the first one in the company so it is the owner
          min((a, b) => {
            return (a.source?.user?.dateAdded || 0) <= (b.source?.user?.dateAdded || 0) ? -1 : 1;
          }),
        ),
      ),
    );

    const numberOfAdmins$ = users$.pipe(count(user => user.source.user.level.valueOf() === 3));
    const companyWithoutAdmin$ = users$.pipe(
      // group by company
      groupBy(user => user.source.company.id),
      mergeMap(group =>
        group.pipe(
          // get users as array
          // TODO: we may be able to do this without doing a toArray but just by playing with the group
          toArray(),
          // filter groups where there is no user with level === 3
          filter(users => !users.some(user => user.source.user.level.valueOf() === 3)),
          // take first element to get the company
          map(users => users[0].source.company),
        ),
      ),
      toArray(),
    );

    const companiesSubscription = companies$.subscribe({
      next(company) {
        progress$.next({
          type: "company:created",
          data: {
            sourceId: company.source.id,
            destinationCode: company.destination.code,
            status: company.error ? "failure" : "success",
            company,
            error: company.error,
          } as CompanyReport,
        });
      },
    });

    const usersSubscription = users$.subscribe({
      next(user) {
        progress$.next({
          type: "user:created",
          data: {
            sourceId: user.source.user.id,
            destinationId: user.destination.id,
            destinationCompanyCode: user.destination.companyCode,
            status: user.error ? "failure" : "success",
            user,
            error: user.error,
          } as UserReport,
        });
      },
      error(err: Error) {
        console.error(err);
      },
    });

    const updateOwners$ = owners$.pipe(
      mergeMap(owner => this.updateUserRole(owner, "owner"), concurrent),
      tap(user =>
        progress$.next({
          type: "user:updated",
          data: {
            sourceId: user.source.source.user.id,
            destinationId: user.source.destination.id,
            destinationCompanyCode: user.source.destination.companyCode,
            status: user.result.error ? "failure" : "success",
            user: user.source,
            error: user.result.error,
          } as UserReport,
        }),
      ),
    );

    const process$ = forkJoin([users$, companies$, numberOfAdmins$, companyWithoutAdmin$]).pipe(
      tap(result => {
        progress$.next({ type: "log", message: `There are ${result[2]} admins` });
        progress$.next({
          type: "company:withoutadmin",
          message: `Companies without admins ${result[3].length}`,
          data: result[3],
        });
        progress$.next({ type: "processing:owner" });
      }),
      mergeMap(() => from(updateOwners$), concurrent),
    );

    const process = process$.subscribe({
      complete() {
        usersSubscription.unsubscribe();
        companiesSubscription.unsubscribe();
        process.unsubscribe();
        progress$.complete();
      },
    });

    return progress$;
  }

  private getStreams(
    concurrent: number = 1,
  ): {
    // hot companies observable
    companies$: Observable<CompanyCreatedStreamObject>;
    // hot users observable
    users$: Observable<UserCreatedStreamObject>;
  } {
    const companies$ = this.getCompanies().pipe(
      mergeMap(company => this.createCompany(company), concurrent),
      // make it hot
      share(),
    );

    const users$ = companies$.pipe(
      filter(company => !company.error),
      mergeMap(company =>
        this.getUserIds(company.source).pipe(
          map(user => ({
            user,
            company,
          })),
        ),
      ),
      mergeMap(
        userInCompany => this.createUser(userInCompany.company.source, userInCompany.user),
        concurrent,
      ),
      // make it hot
      share(),
    );

    return {
      companies$,
      users$,
    };
  }

  private getUserIds(company: Company, paginable?: Paginable): Observable<CompanyUser> {
    return from(this.userService.companies.getUsers({ group_id: company.id }, paginable)).pipe(
      mergeMap(companyUsers => {
        const items$ = from(companyUsers.getEntities());
        const next$ = companyUsers?.nextPage?.page_token
          ? this.getUserIds(company, companyUsers.nextPage)
          : EMPTY;
        return concat(items$, next$);
      }),
      distinct(user => user.user_id),
    );
  }

  private getCompanies(paginable?: Paginable): Observable<Company> {
    return from(this.userService.companies.getCompanies(paginable)).pipe(
      mergeMap(companiesResult => {
        const items$ = from(companiesResult.getEntities());
        const next$ = companiesResult?.nextPage?.page_token
          ? this.getCompanies(companiesResult.nextPage)
          : EMPTY;

        return concat(items$, next$);
      }),
      distinct((company: Company) => company.id),
    );
  }

  private async createCompany(company: Company): Promise<CompanyCreatedStreamObject> {
    logger.debug("Creating company in the Console %s", company.displayName);
    let createdCompany: CreatedConsoleCompany;
    let error;

    try {
      createdCompany = await this.client.createCompany({
        code: company.id,
        displayName: company.displayName,
        avatar: {
          type: "url",
          value: company.logo,
        },
        status: "active",
      });

      if (this.linkExternal) {
        await this.createCompanyLink(company, createdCompany, this.consoleId);
      }
    } catch (err) {
      logger.warn("Error while creating company %s", company.displayName);
      error = err;
    }

    return {
      source: company,
      destination: {
        code: createdCompany?.code,
      },
      error,
    };
  }

  private async createUser(
    company: Company,
    companyUser: CompanyUser,
  ): Promise<UserCreatedStreamObject> {
    logger.debug("Creating user in console %o", companyUser.user_id);
    let error: Error;
    let result: CreatedConsoleUser;

    try {
      const user = await this.userService.users.get({ id: companyUser.user_id });

      if (!user) {
        throw new Error(`User ${companyUser.user_id} not found`);
      }

      const firstName =
        user.first_name && user.first_name.trim().length ? user.first_name : user.email_canonical;
      const lastName =
        user.last_name && user.last_name.trim().length ? user.last_name : user.email_canonical;
      const name = (firstName + " " + lastName).trim();

      let role: "admin" | "guest" | "member" =
        companyUser.level.valueOf() === 3 ? "admin" : "member";
      if (role != "admin") {
        if (companyUser.isExterne) {
          role = "guest";
        }
        const workspacesUsers = await this.userService.workspaces.getAllForUser(
          { userId: companyUser.user_id },
          { id: company.id },
        );
        workspacesUsers.forEach(e => {
          if (e.isExternal) {
            role = "guest";
          }
        });
      }

      result = await this.client.addUserToCompany(
        { code: company.id },
        {
          email: user.email_canonical,
          // console requires that firstname/lastname are defined and at least 1 chat long
          firstName,
          lastName,
          name,
          avatar: {
            type: "url",
            value: user.picture,
          },
          password: passwordGenerator.generate({
            length: 10,
            numbers: true,
          }),
          skipInvite: true,
          role,
        },
      );

      const companyUserRepository = await this.database.getRepository<CompanyUser>(
        "group_user",
        CompanyUser,
      );
      companyUser.role = role;
      await companyUserRepository.save(companyUser);

      if (this.linkExternal) {
        await this.createUserLink(user, result, this.consoleId);
      }
    } catch (err) {
      logger.warn("Error while creating the user %o", companyUser.user_id);
      error = err;
    }

    return {
      source: { user: companyUser, company },
      destination: {
        id: result?._id,
        companyCode: company.id,
      },
      error,
    };
  }

  private async createUserLink(
    localUser: User,
    remoteUser: CreatedConsoleUser,
    serviceId: string,
  ): Promise<void> {
    logger.debug("Creating user link for user %s", localUser.id);
    if (this.dryRun) {
      return;
    }

    await this.userService.external.createExternalUser(
      getExternalUserInstance({
        service_id: serviceId,
        external_id: remoteUser._id,
        user_id: localUser.id,
      }),
    );
  }

  private async createCompanyLink(
    localCompany: Company,
    remoteCompany: CreatedConsoleCompany,
    serviceId: string,
  ): Promise<void> {
    if (this.dryRun) {
      return;
    }

    await this.userService.external.createExternalGroup(
      getExternalGroupInstance({
        service_id: serviceId,
        company_id: localCompany.id,
        external_id: remoteCompany.code,
      }),
    );
  }

  private updateUserRole(
    user: UserCreatedStreamObject,
    role: CompanyUserRole,
  ): Promise<{
    source: UserCreatedStreamObject;
    result: UpdateConsoleUserRole & { error?: Error };
  }> {
    logger.debug(
      `Updating user role for user ${user.source.user.id} in company ${user.source.company.id}`,
    );
    return this.client
      .updateUserRole({ code: user.destination.companyCode }, { id: user.destination.id, role })
      .then(result => ({ source: user, result }))
      .catch((err: Error) => {
        return {
          source: user,
          result: {
            id: user.destination.id,
            role,
            error: err,
          },
        };
      });
  }
}
