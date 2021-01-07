/* eslint-disable @typescript-eslint/no-unused-vars */
import { RealtimeDeleted, RealtimeSaved, TwakeContext } from "../../../../core/platform/framework";
import { ResourcePath } from "../../../../core/platform/services/realtime/types";
import {
  SaveResult,
  DeleteResult,
  ListResult,
  OperationType,
  Paginable,
  CrudExeption,
} from "../../../../core/platform/framework/api/crud-service";
import { UserNotificationBadgeServiceAPI } from "../../api";
import {
  UserNotificationBadge,
  UserNotificationBadgePrimaryKey,
  UserNotificationBadgeType,
} from "../../entities";
import { NotificationExecutionContext } from "../../types";
import { getNotificationRoomName } from "../realtime";
import { DatabaseServiceAPI } from "../../../../core/platform/services/database/api";
import Repository from "../../../../core/platform/services/database/services/orm/repository/repository";
import { pick } from "lodash";
import _ from "lodash";

export class UserNotificationBadgeService implements UserNotificationBadgeServiceAPI {
  version: "1";
  repository: Repository<UserNotificationBadge>;

  constructor(private database: DatabaseServiceAPI) {}

  async init(context: TwakeContext): Promise<this> {
    this.repository = await this.database.getRepository<UserNotificationBadge>(
      UserNotificationBadgeType,
      UserNotificationBadge,
    );

    return this;
  }

  async get(pk: UserNotificationBadgePrimaryKey): Promise<UserNotificationBadge> {
    return await this.repository.findOne(pk);
  }

  @RealtimeSaved<UserNotificationBadge>((badge, context) => {
    return [
      {
        room: ResourcePath.get(getNotificationRoomName(badge.user_id)),
      },
    ];
  })
  async save<SaveOptions>(
    badge: UserNotificationBadge,
    options: SaveOptions,
    context: NotificationExecutionContext,
  ): Promise<SaveResult<UserNotificationBadge>> {
    const badgeEntity = new UserNotificationBadge();
    _.assign(badgeEntity, badge);
    await this.repository.save(badgeEntity);

    return new SaveResult(UserNotificationBadgeType, badge, OperationType.CREATE);
  }

  @RealtimeDeleted<UserNotificationBadge>((badge, context) => {
    return [
      {
        room: ResourcePath.get(getNotificationRoomName(badge.user_id)),
      },
    ];
  })
  async delete(
    pk: UserNotificationBadgePrimaryKey,
    context?: NotificationExecutionContext,
  ): Promise<DeleteResult<UserNotificationBadge>> {
    await this.repository.remove(pk as UserNotificationBadge);

    return new DeleteResult(UserNotificationBadgeType, pk as UserNotificationBadge, true);
  }

  list(): Promise<ListResult<UserNotificationBadge>> {
    throw new Error("Not implemented");
  }

  listForUser(
    company_id: string,
    user_id: string,
    filter: Pick<UserNotificationBadgePrimaryKey, "workspace_id" | "channel_id" | "thread_id">,
  ): Promise<ListResult<UserNotificationBadge>> {
    if (!company_id || !user_id) {
      throw CrudExeption.badRequest("company_id and user_id are required");
    }

    return this.repository.find({
      ...{
        company_id,
        user_id,
      },
      ...pick(filter, ["workspace_id", "channel_id", "thread_id"]),
    });
  }

  /**
   * FIXME: This is a temporary implementation which is sending as many websocket notifications as there are badges to remove
   * A better implementation will be to do a bulk delete and have a single websocket notification event
   * @param filter
   */
  async removeUserChannelBadges(
    filter: Pick<
      UserNotificationBadgePrimaryKey,
      "workspace_id" | "company_id" | "channel_id" | "user_id"
    >,
  ): Promise<number> {
    const badges = (await this.repository.find(filter)).getEntities();

    return (
      await Promise.all(
        badges.map(async badge => {
          try {
            return (await this.delete(badge)).deleted;
          } catch (err) {}
        }),
      )
    ).filter(Boolean).length;
  }
}
