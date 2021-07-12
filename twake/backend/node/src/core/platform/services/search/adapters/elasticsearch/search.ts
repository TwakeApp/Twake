import _ from "lodash";
import { EntityTarget, FindFilter, FindOptions, getEntityDefinition } from "../../api";

export function buildSearchQuery<Entity>(
  entityType: EntityTarget<Entity>,
  filters: FindFilter,
  options: FindOptions = {},
): { project: any; query: any; sort: any } {
  const instance = new (entityType as any)();
  const { entityDefinition, columnsDefinition } = getEntityDefinition(instance);

  //TODO

  return {
    project: { score: { $meta: "textScore" } } || false,
    query: { $text: options.$text || undefined },
    sort: {},
  };
}
