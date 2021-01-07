import { logger } from "../../../../../../core/platform/framework";
import { NotificationPubsubHandler, NotificationServiceAPI } from "../../../../api";
import { ChannelReadMessage } from "../../../../types";

export class MarkChannelAsReadMessageProcessor
  implements NotificationPubsubHandler<ChannelReadMessage, void> {
  constructor(readonly service: NotificationServiceAPI) {}

  readonly topics = {
    in: "channel:read",
  };

  readonly name = "MarkChannelAsReadMessageProcessor";

  validate(message: ChannelReadMessage): boolean {
    return !!(
      message &&
      message.channel &&
      message.channel.workspace_id &&
      message.channel.company_id &&
      message.channel.id &&
      message.member &&
      message.member.user_id
    );
  }

  async process(message: ChannelReadMessage): Promise<void> {
    logger.info(
      `${this.name} - Processing message for user ${message.member.user_id} in channel ${message.channel.id}`,
    );

    await this.removeBadges(message);
  }

  async removeBadges(message: ChannelReadMessage): Promise<void> {
    logger.info(
      `${this.name} - Removing badges for user ${message.member.user_id} in channel ${message.channel.id}`,
    );

    try {
      const removedBadges = await this.service.badges.removeUserChannelBadges({
        workspace_id: message.channel.workspace_id,
        company_id: message.channel.company_id,
        channel_id: message.channel.id,
        user_id: message.member.user_id,
      });

      logger.info(
        `${this.name} - Removed ${removedBadges} badges for user ${message.member.user_id} in channel ${message.channel.id}`,
      );
    } catch (err) {
      logger.warn(
        { err },
        `${this.name} - Error while removing badges for user ${message.member.user_id} in channel ${message.channel.id}`,
      );
    }
  }
}
