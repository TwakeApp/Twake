import { ColumnType } from "../../types";
import { decrypt, encrypt } from "../../utils";

export const transformValueToDbString = (v: any, type: ColumnType, options: any = {}): string => {
  if (type === "encoded_string" || type === "encoded_json") {
    if (type === "encoded_json") {
      try {
        v = JSON.stringify(v);
      } catch (err) {
        v = null;
      }
    }
    if (v !== undefined) {
      v = encrypt(v, options.secret);
    }
    return v;
  }
  if (type === "blob") {
    return ""; //Not implemented yet
  }
  if (type === "string" || type === "json") {
    if (type === "json") {
      try {
        v = JSON.stringify(v);
      } catch (err) {
        v = null;
      }
    }
    return v;
  }
  return v || "";
};

export const transformValueFromDbString = (v: any, type: string, options: any = {}): any => {
  if ((v !== null && type === "encoded_string") || type === "encoded_json") {
    try {
      v = decrypt(v, options.secret);
    } catch (err) {
      v = v;
    }
    if (type === "encoded_json") {
      try {
        return JSON.parse(v);
      } catch (err) {
        return null;
      }
    }
  }
  if (type === "json") {
    try {
      return JSON.parse(v);
    } catch (err) {
      return null;
    }
  }
  return v;
};
