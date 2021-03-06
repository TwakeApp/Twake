import { FindOptions } from "../../repository/repository";
import { ObjectType } from "../../types";
import { getEntityDefinition } from "../../utils";
import { transformValueToDbString } from "./typeTransforms";

export function buildSelectQuery<Entity>(
  entityType: ObjectType<Entity>,
  filters: any,
  findOptions: FindOptions,
  options: {
    keyspace: string;
  } = {
    keyspace: "twake",
  },
): string {
  const instance = new (entityType as any)();
  const { columnsDefinition, entityDefinition } = getEntityDefinition(instance);

  const where = Object.keys(filters)
    .map(key => {
      let result: string;
      const filter = filters[key];

      if (!filter) {
        return;
      }

      if (Array.isArray(filter)) {
        if (!filter.length) {
          return;
        }
        const inClause: string[] = filter.map(
          value =>
            `${transformValueToDbString(
              value,
              columnsDefinition[key].type,
              columnsDefinition[key].options,
            )}`,
        );

        result = `${key} IN (${inClause.join(",")})`;
      } else {
        result = `${key} = ${transformValueToDbString(
          filter,
          columnsDefinition[key].type,
          columnsDefinition[key].options,
        )}`;
      }

      return result;
    })
    .filter(Boolean);

  const query = `SELECT * FROM ${options.keyspace}.${entityDefinition.name} WHERE ${[
    ...where,
    ...(buildComparison(findOptions) || []),
  ].join(" AND ")}`;

  return query;
}

export function buildComparison(options: FindOptions = {}): string[] {
  let lessClause;
  let lessEqualClause;
  let greaterClause;
  let greaterEqualClause;

  if (options.$lt) {
    lessClause = options.$lt.map(element => `${element[0]} < ${element[1]}`);
  }

  if (options.$lte) {
    lessEqualClause = options.$lte.map(element => `${element[0]} <= ${element[1]}`);
  }

  if (options.$gt) {
    greaterClause = options.$gt.map(element => `${element[0]} > ${element[1]}`);
  }

  if (options.$gte) {
    greaterEqualClause = options.$gte.map(element => `${element[0]} >= ${element[1]}`);
  }

  return [
    ...(lessClause || []),
    ...(lessEqualClause || []),
    ...(greaterClause || []),
    ...(greaterEqualClause || []),
  ];
}
