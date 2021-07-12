import { expandStringForPrefix } from "../../../core/platform/services/search/adapters/utils";
import User from "./user";

export default {
  index: "user",
  source: (entity: User) => {
    const expanded = `${entity.first_name} ${entity.last_name} ${entity.email_canonical}`;
    let source: any = {
      first_name: entity.first_name,
      last_name: entity.last_name,
      email_canonical: entity.email_canonical,
      expanded: expandStringForPrefix(expanded),
    };
    if (entity.cache?.companies && entity.cache?.workspaces) {
      return {
        companies: entity.cache?.companies,
        workspaces: entity.cache?.workspaces,
        ...source,
      };
    }
    return source;
  },
  mongoMapping: {
    text: {
      first_name: "text",
      last_name: "text",
      email_canonical: "text",
      expanded: "text",
    },
  },
  esMapping: {
    properties: {
      first_name: { type: "text" },
      last_name: { type: "text" },
      email_canonical: { type: "text" },
      expanded: { type: "text" },
      companies: { type: "keyword" },
      workspaces: { type: "keyword" },
    },
  },
};
