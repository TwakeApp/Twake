import { Message } from '../../../models/Message';
import Numbers from '../../utils/Numbers';
import FeatureTogglesService, { FeatureNames } from 'app/services/FeatureTogglesService';

class MessageHistoryService {
  shouldLimitMessages(firstMessageId: string, messagesCount: number): boolean {
    const MONTH = 1000 * 60 * 60 * 24 * 30;
    const DELAY = 3 * MONTH;
    const MIN_MESSAGES = 100;

    const firstMessageTimestamp = Numbers.timeuuidToDate(firstMessageId) * 1000;
    const isFirstMessageOlderOrEqualThanDelay = firstMessageTimestamp >= DELAY;
    const isActiveFeature = FeatureTogglesService.isActiveFeatureName(FeatureNames.MESSAGE_HISTORY);
    return isFirstMessageOlderOrEqualThanDelay && !isActiveFeature && messagesCount >= MIN_MESSAGES;
  }

  getLimitChannelMessageObject(): Message {
    return {
      id: '0000000-0000-1000-0000-00000000',
      message_type: 2,
      hidden_data: { type: 'limit_channel' },
      creation_date: 0,
    };
  }
}

export default new MessageHistoryService();