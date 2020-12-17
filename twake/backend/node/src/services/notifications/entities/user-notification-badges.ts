import { Type } from "class-transformer";
import { ChannelType } from "../../types";
import { Column, Entity } from "../../../core/platform/services/database/services/orm/decorators";

/**
 * Table user-notification-badges
 */
@Entity(UserNotificationBadge.TYPE, {
  primaryKey: [["company_id"], "user_id", "workspace_id", "channel_id", "thread_id"],
  type: UserNotificationBadge.TYPE,
})
export class UserNotificationBadge {
  static TYPE = "user_notification_badges";

  /**
   * UUIDv4
   * Primary key / partition key
   */
  @Type(() => String)
  @Column("company_id", "uuid")
  company_id: string;

  /**
   * UUIDv4
   */
  @Type(() => String)
  @Column("user_id", "uuid")
  user_id: string;

  /**
   * Text
   * Primary key
   */
  @Type(() => String)
  @Column("workspace_id", "string")
  workspace_id: string | ChannelType.DIRECT;

  /**
   * UUIDv4
   * Primary key
   */
  @Type(() => String)
  @Column("channel_id", "uuid")
  channel_id: string;

  /**
   * UUIDv4
   * Primary key
   */
  @Type(() => String)
  @Column("thread_id", "uuid")
  thread_id: string;
}

export type UserNotificationBadgePrimaryKey = Pick<
  UserNotificationBadge,
  "user_id" | "company_id" | "workspace_id" | "channel_id" | "thread_id"
>;
