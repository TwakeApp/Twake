import passwordGenerator from "generate-password";
import { from, pipe } from "rxjs";
import { bufferCount, first, map, mergeMap, switchMap, tap } from "rxjs/operators";
import { v1 as uuid } from "uuid";
import yargs from "yargs";

import Company, {
  getInstance as getCompanyInstance,
} from "../../../services/user/entities/company";
import CompanyUser from "../../../services/user/entities/company_user";
import UserServiceAPI from "../../../services/user/api";
import twake from "../../../twake";
import User, { getInstance as getUserInstance } from "../../../services/user/entities/user";

type CLIArgs = {
  company: number;
  user: number;
  concurrent: number;
};

const services = ["user", "channels", "notifications", "database", "webserver", "pubsub"];

// eslint-disable-next-line @typescript-eslint/ban-types
const command: yargs.CommandModule<{}, CLIArgs> = {
  command: "users",
  describe: "Generate users and companies",
  builder: {
    company: {
      alias: "c",
      default: 3,
      type: "number",
      description: "Number of companies to generate",
    },
    user: {
      alias: "u",
      default: 5,
      type: "number",
      description: "Number of users to generate in the company",
    },
    concurrent: {
      default: 1,
      type: "number",
      description: "Number of concurrent creation tasks",
    },
  },
  handler: async argv => {
    const concurrentTasks = argv.concurrent;
    const nbUsersPerCompany = argv.user;
    const nbCompanies = argv.company;
    const platform = await twake.run(services);
    const userService = platform.getProvider<UserServiceAPI>("user");
    const companies = getCompanies(nbCompanies);
    const createUser = async (userInCompany: {
      user: User;
      company: Company;
    }): Promise<CompanyUser> => {
      console.log("Creating user", userInCompany);
      const created = await userService.users.create(getUserInstance(userInCompany.user));

      return userService.companies.setUserRole(userInCompany.company.id, created.entity.id);
    };
    const createCompany = (company: Company) => {
      console.log("Creating company", company);
      return userService.companies.createCompany(company);
    };

    const obsv$ = from(companies).pipe(
      // Create companies sequentially
      mergeMap(company => createCompany(company), concurrentTasks),
      // until we create enough companies
      bufferCount(companies.length),
      tap(companies => console.log("Created companies", companies.length)),
      // for each created company
      switchMap(companies => from(companies)),
      // generate a set of user for each company
      map(company => getUsersForCompany(company, nbUsersPerCompany)),
      // Create users sequentially
      pipe(
        switchMap(userCompanies => from(userCompanies)),
        mergeMap(userCompany => createUser(userCompany), concurrentTasks),
        // until we reach the number of users in the company
        bufferCount(nbUsersPerCompany),
      ),
      // until we reach the number of companies
      bufferCount(companies.length),
      first(),
    );

    return obsv$
      .toPromise()
      .then(() => platform.stop())
      .finally(() => console.log("✅ Company users are now created"));
  },
};

const getCompanies = (size: number = 10): Company[] => {
  return [...Array(size).keys()].map(i =>
    getCompanyInstance({
      id: uuid(),
      name: `twake${i}.app`,
      displayName: `My Twake Company #${i}`,
    }),
  );
};

const getUsersForCompany = (company: Company, size: number = 10) => {
  return getUsers(company, size).map(user => ({
    user,
    company,
  }));
};

const getUsers = (company: Company, size: number = 100): User[] => {
  return [...Array(size).keys()].map(i => getUser(company, i));
};

const getUser = (company: Company, id: number): User => {
  return getUserInstance({
    id: uuid(),
    first_name: "John",
    last_name: `Doe${id}`,
    email_canonical: `user${id}@${company.name}`,
    creation_date: Date.now(),
    password: passwordGenerator.generate({
      length: 10,
      numbers: true,
    }),
  });
};

export default command;
