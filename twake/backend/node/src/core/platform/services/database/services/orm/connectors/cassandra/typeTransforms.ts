/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { isBoolean, isNumber } from "lodash";
import { ColumnType } from "../../types";

export const cassandraType = {
  plainstring: "TEXT",
  string: "TEXT",
  json: "TEXT",
  number: "BIGINT",
  timeuuid: "TIMEUUID",
  uuid: "UUID",
  counter: "COUNTER",
  blob: "BLOB",
  boolean: "BOOLEAN",
};

export const transformValueToDbString = (v: any, type: ColumnType, options: any = {}): string => {
  if (type === "number") {
    if (!isNumber(v)) {
      throw new Error(`'${v}' is not a ${type}`);
    }
    return `${v}`;
  }
  if (type === "uuid" || type === "timeuuid") {
    v = (v || "").replace(/[^a-zA-Z0-9-]/g, "");
    return `${v}`;
  }
  if (type === "boolean") {
    if (!isBoolean(v)) {
      throw new Error(`'${v}' is not a ${type}`);
    }
    return `${!!v}`;
  }
  if (type === "string" || type === "json") {
    if (type === "json") {
      try {
        v = JSON.stringify(v);
      } catch (err) {
        v = null;
      }
    }
    return `'${v || ""}'`; //Encryption not implemented yet
  }
  if (type === "blob") {
    return "''"; //Not implemented yet
  }
  return `'${v || ""}'`;
};

export const transformValueFromDbString = (v: any, type: string, options: any = {}): any => {
  if (type === "json") {
    try {
      return JSON.parse(v);
    } catch (err) {
      return null;
    }
  }

  return v;
};
