import DepreciatedCollections from 'app/services/Depreciated/Collections/Collections';
import Collection from 'app/services/Depreciated/Collections/Collection';
import Numbers from 'services/utils/Numbers';
import Observable from 'app/services/Depreciated/observable';
import Logger from 'app/services/Logger';
import { Message } from '../../../models/Message';
import {
  FeedLoader,
  NextParameters,
  FeedResponse,
  InitParameters,
  Completion,
} from '../Feed/FeedLoader';
import { ChannelResource } from 'app/models/Channel';
import MessageHistoryService from 'app/services/Apps/Messages/MessageHistoryService';

const DEFAULT_PAGE_SIZE = 25;

/*
  This class will manage what is loaded from the backend and what's not, the complete list of messages for a channel will always be h
*/
export class MessageLoader extends Observable implements FeedLoader<Message> {
  readonly key: string;

  private logger: Logger.Logger;

  private pageSize!: number;

  /**
   * First message of the feed has been reached. There are no more ways to load more upwards.
   * Once true, this property should not be updated anymore.
   */
  private topHasBeenReached = false;

  /**
   * Last message of the feed has been reached. The only way to have this switching back from true to false is when new messages are piped down the stream.
   */
  private bottomHasBeenReached = false;

  /**
   * The first message of the stream. Once set, there are no ways to get oldest messages than this one and so the stream is marked as complete at top side
   */
  private firstMessageOfTheStream = '';

  /**
   * The identifier of the first message which has been loaded ie the oldest message from all the messages received
   */
  private firstMessageOffset = '';

  /**
   * The identifier of the last message which has been loaded ie the yougest message from all the messages received
   */
  private lastMessageOffset = '';

  /**
   * The identifier of the last thread of the feed
   */
  private lastThreadId = '';

  /**
   * Last message of the stream. Its value can change if new messages are created
   */
  private lastMessageOfTheStream = '';

  private initialDirection: 'up' | 'down';

  /**
   * Last message of the feed, this is the one which has the bigger creation date | timeuuid (ie the youngest)
   */
  private lastMessageId: string = '';
  /**
   * First message of the feed, this is the one which has the smaller creation date | timeuuid (ie the oldest)
   */
  private firstMessageId: string = '';

  private didInit = false;

  private httpLoading = false;

  private nbCalls = 0;

  private collection: Collection;

  private messagesCount: number = 0;

  static getKey(channel: ChannelResource, collectionKey: string, threadId?: string): string {
    return `channel:${channel.data.id}/collection:${collectionKey}/thread:${threadId}`;
  }

  constructor(
    private collectionKey: string,
    private channel: ChannelResource,
    private threadId: string = '',
  ) {
    super();
    this.key = MessageLoader.getKey(channel, collectionKey, threadId);
    this.logger = Logger.getLogger(`MessageLoader/${this.channel.id}`);
    this.collection = DepreciatedCollections.get('messages');
    this.initialDirection = 'up';
    this.onNewMessageFromWebsocketListener = this.onNewMessageFromWebsocketListener.bind(this);
  }

  async init(params: InitParameters = { direction: 'up' }): Promise<FeedResponse<Message>> {
    this.pageSize = params.pageSize || DEFAULT_PAGE_SIZE;
    this.initialDirection = params.direction ? params.direction : this.initialDirection;
    // FIXME: When not destroyed and calling init again and again, we stack many listeners
    this.collection.addListener(this.onNewMessageFromWebsocketListener);

    if (this.httpLoading) {
      this.logger.warn('Init in progress, skipping');
      return this.buildResponse([], false, params);
    }

    // if already initialized, send back the whole messages
    if (this.didInit) {
      // We do not know if there are new messages since the last nextPage call so we reset the bottom flags
      // the top flag stays like it was, we can not add new messages before the initial one
      this.bottomHasBeenReached = false;
      return this.buildResponse(this.getItems(), false, params);
    }

    // On first call
    if (params.offset) {
      this.firstMessageOffset = params.offset;
    }

    return new Promise<FeedResponse<Message>>(resolve => {
      this.httpLoading = true;
      this.collection.addSource(
        {
          http_base_url: 'discussion',
          http_options: {
            channel_id: this.channel.data.id,
            company_id: this.channel.data.company_id,
            workspace_id: this.channel.data.workspace_id,
            parent_message_id: this.threadId,
            limit: (this.initialDirection === 'up' ? 1 : -1) * this.pageSize,
            offset: params.offset || false,
          },
          websockets: [{ uri: `messages/${this.channel.data.id}`, options: { type: 'messages' } }],
        },
        this.collectionKey,
        // First load callback
        (messages: Message[]) => {
          this.nbCalls++;
          this.logger.debug('Initial messages', messages);
          this.updateCursors(messages);
          this.httpLoading = false;
          this.messagesCount = this.pageSize;

          // loading a thread
          if (this.threadId) {
            if (messages.length < this.pageSize) {
              this.setBottomIsComplete();
            }
          }

          // loading from an initial offset ie opening feed from a given message
          if (!this.threadId && params.offset && this.initialDirection === 'down') {
            if (messages.length < this.pageSize) {
              this.setBottomIsComplete();
            }
          }

          if (!params.offset && this.initialDirection === 'up') {
            // without any offset, we loaded all the bottom messages on this first call
            this.setBottomIsComplete();
          }

          if (
            messages[0]?.hidden_data?.type === 'init_channel' ||
            (this.nbCalls > 1 && messages.length < this.pageSize)
          ) {
            this.setTopIsComplete();
          }

          if (this.threadId && this.initialDirection === 'down') {
            // TODO: Move this in the first block
            this.setTopIsComplete();
          }

          // bottom reached?
          if (!params.offset && messages.length < this.pageSize) {
            this.setBottomIsComplete();
          }

          this.notify();
          this.didInit = true;

          resolve(this.buildResponse(this.getItems(), false, params));
        },
      );
    });
  }

  async nextPage(params: { direction: 'up' | 'down' }): Promise<FeedResponse<Message>> {
    const loadUp = params.direction === 'up';
    this.logger.debug('nextPage - ', params);

    if (
      loadUp &&
      MessageHistoryService.shouldLimitMessages(this.firstMessageId, this.messagesCount)
    ) {
      const limitChannelMessage = MessageHistoryService.getLimitChannelMessageObject();

      this.setTopIsComplete();
      return this.buildResponse([limitChannelMessage], true, params);
    }

    if (!this.didInit) {
      throw new Error('Loader must be initialized first');
    }

    if (this.httpLoading) {
      this.logger.debug('nextPage - HTTP is already ongoing');

      return this.buildResponse([], false, params);
    }

    const bottomOffset = Numbers.maxTimeuuid(this.lastThreadId, this.lastMessageOffset);
    const offset = this.threadId
      ? this.firstMessageId
      : loadUp
      ? this.firstMessageOffset
      : bottomOffset;
    const fromTo = {
      from: loadUp ? '' : bottomOffset,
      to: loadUp ? this.firstMessageId : '',
    };

    return new Promise(resolve => {
      this.httpLoading = true;
      this.collection.sourceLoad(
        this.collectionKey,
        {
          offset,
          limit: (loadUp ? 1 : -1) * this.pageSize,
        },
        (messages: Message[]) => {
          this.nbCalls++;
          this.messagesCount += messages.length;
          this.httpLoading = false;
          this.logger.debug('nextPage - messages', messages);
          this.updateCursors(messages);

          // if messages length is 0 then we should send back empty items...
          if (messages.length < this.pageSize) {
            loadUp ? this.setTopIsComplete() : this.setBottomIsComplete();
          }

          // update the offset to get items from the new cursor values
          if (loadUp) {
            fromTo.from = this.firstMessageOffset;
            if (this.nbCalls === 1) {
              // In this case, the init callback has never been called
              // This means that the current loader instance has been cleaned
              // and that we need to update the fromTo
              fromTo.to = Numbers.maxTimeuuid(this.lastThreadId, this.lastMessageId);
            }
          } else {
            fromTo.to = Numbers.maxTimeuuid(this.lastThreadId, this.lastMessageId);
          }

          resolve(this.buildResponse(this.getItems(fromTo), true, params));
        },
      );
    });
  }

  private buildResponse(
    items: Message[],
    loaded: boolean,
    params: NextParameters,
    err?: Error,
  ): FeedResponse<Message> {
    return {
      items,
      loaded,
      completes: {
        bottom: this.bottomHasBeenReached,
        top: this.topHasBeenReached,
      },
      offsets: {
        down: this.lastMessageOffset,
        up: this.firstMessageOffset,
      },
      query: {
        direction: params.direction,
        pageSize: this.pageSize,
        offset: params.offset,
      },
      err,
    };
  }

  getItems(fromTo?: { from: string; to: string }): Message[] {
    const offsets = fromTo || { from: this.firstMessageId, to: this.lastMessageId };

    this.logger.debug('Get items with offset', offsets, `(was set? ${!!fromTo})`);
    const filter: any = {
      channel_id: this.channel.data.id,
    };
    if (this.threadId) {
      filter.parent_message_id = this.threadId;
    }
    let messages: Message[] = this.collection.findBy(filter, null);

    messages = messages
      // keep only the messages between the first and last loaded ones
      .filter(
        message =>
          Numbers.compareTimeuuid(offsets.to, message.id) >= 0 &&
          Numbers.compareTimeuuid(offsets.from, message.id) <= 0,
      )
      // remove ephemeral messages
      .filter(message => !message._user_ephemeral)
      // remove init_channel messages
      .filter(message => message.hidden_data.type !== 'init_channel')
      // sort them by creation date
      .sort((a, b) => (a?.creation_date || 0) - (b?.creation_date || 0));

    if (!this.threadId) {
      let lastParentId = '';
      messages = messages.filter(message => {
        if (message.parent_message_id) {
          return lastParentId &&
            lastParentId !== message.parent_message_id &&
            Numbers.compareTimeuuid(message.parent_message_id, message.id) <= 0
            ? true
            : false;
        } else {
          lastParentId = message.id || '';
        }
        return true;
      });
    }

    if (this.threadId) {
      const initThreadMessage = MessageHistoryService.getInitThreadMessageObject({
        thread_id: this.threadId,
        channel_id: this.channel.id,
      });
      messages = [initThreadMessage, ...messages];
    } else {
      const initChannelMessage = MessageHistoryService.getInitChannelMessageObject(this.channel.id);
      messages = [...(this.topHasBeenReached ? [initChannelMessage] : []), ...messages];
    }

    return messages;
  }

  getCompletion(): Completion {
    return {
      top: this.topHasBeenReached,
      bottom: this.bottomHasBeenReached,
    };
  }

  getLastItem(): string {
    return this.lastMessageId;
  }

  /**
   * Updates the last message of the feed with the given one if and only if it is newer than the previous one
   *
   * @param message
   * @returns
   */
  private setLastMessageId(message: Message): void {
    if (!message || !message.id) {
      return;
    }

    if (!this.lastMessageId) {
      this.lastMessageId = message.id;
    } else {
      this.lastMessageId =
        Numbers.compareTimeuuid(this.lastMessageId, message.id) <= 0
          ? message.id
          : this.lastMessageId;
    }
  }

  private setLastThreadId(message: Message): void {
    if (!message || message.parent_message_id || !message.id) {
      return;
    }

    if (!this.lastThreadId) {
      this.lastThreadId = message.id;
    } else {
      this.lastThreadId =
        Numbers.compareTimeuuid(this.lastThreadId, message.id) <= 0
          ? message.id
          : this.lastThreadId;
    }
  }

  private setFirstMessageId(message: Message): void {
    if (!message || !message.id) {
      return;
    }

    if (!this.firstMessageId) {
      this.firstMessageId = message.id;
    } else {
      this.firstMessageId =
        Numbers.compareTimeuuid(this.firstMessageId, message.id) >= 0
          ? message.id
          : this.firstMessageId;
    }
  }

  private hasLastMessage(): boolean {
    return !!this.lastMessageOfTheStream;
  }

  private detectNewWebsocketsMessages(messages: Message[]): Message[] {
    const newUnknownMessages: Message[] = [];

    messages.forEach(m => {
      if (Numbers.compareTimeuuid(this.lastMessageId, m.id) < 0) {
        newUnknownMessages.push(m);
      }
    });

    newUnknownMessages.forEach(m => this.onNewMessageFromWebsocket(m));

    return newUnknownMessages;
  }

  private onNewMessageFromWebsocketListener(_event: any): void {
    const newMessages = this.detectNewWebsocketsMessages(
      this.collection.findBy(
        {
          channel_id: this.channel.data.id,
        },
        null,
      ),
    );
    this.logger.debug('New messages from websocket', newMessages);
    if (newMessages.length) {
      this.notify();
    }
  }

  private onNewMessageFromWebsocket(message: Message) {
    // simply update the first and last messages and not the pagination
    this.updateFirstLast([message]);
  }

  reset(force?: boolean): void {
    this.firstMessageOffset = '';
    this.lastMessageOffset = '';
    this.lastMessageId = '';
    this.firstMessageId = '';
    this.lastThreadId = '';
    this.nbCalls = 0;
    if (force) {
      this.firstMessageOfTheStream = '';
      this.lastMessageOfTheStream = '';
      this.topHasBeenReached = false;
      this.bottomHasBeenReached = false;
    }
  }

  private updateCursors(messages: Message[] = []) {
    this.logger.debug(
      'Updating pagination cursors with messages',
      messages.map(m => m.id).join(' - '),
    );
    this.printCursors('Before update');

    const wasAtEnd = this.hasLastMessage();

    this.lastMessageOffset = Numbers.maxTimeuuid(
      this.lastMessageOffset,
      '00000000-0000-1000-0000-000000000000',
    );
    messages.forEach(m => {
      if (m.hidden_data?.type === 'init_channel') {
        this.topHasBeenReached = true;
      }
      this.setLastMessageId(m);
      this.setFirstMessageId(m);
      this.setLastThreadId(m);
      this.lastMessageOffset = Numbers.maxTimeuuid(this.lastMessageOffset, m.id);
      this.firstMessageOffset = Numbers.minTimeuuid(this.firstMessageOffset, m.id);
    });

    if (wasAtEnd) {
      this.lastMessageOfTheStream = Numbers.maxTimeuuid(
        this.lastMessageOfTheStream,
        this.lastMessageOffset,
      );
    }
    this.printCursors('After update');
  }

  /**
   * Update the first and last message cursors. We do not update the pagination ones here, just the global ones.
   *
   * @param messages
   */
  private updateFirstLast(messages: Message[] = []): void {
    messages.forEach(m => {
      if (m.hidden_data?.type === 'init_channel') {
        this.topHasBeenReached = true;
      }
      // TODO: update the last thread
      this.setLastMessageId(m);
      this.setFirstMessageId(m);
    });
  }

  private printCursors(label: string = '') {
    this.logger.debug(`${label} Cursors:
      firstMessageOffset: ${this.firstMessageOffset},
      lastMessageOffset: ${this.lastMessageOffset},
      lastThreadId: ${this.lastThreadId},
      lastMessageOfTheStream: ${this.lastMessageOfTheStream},
      firstMessageId: ${this.firstMessageId},
      lastMessageId: ${this.lastMessageId},
    `);
  }

  private setTopIsComplete(): void {
    this.firstMessageOfTheStream = Numbers.minTimeuuid(
      this.firstMessageOffset,
      this.firstMessageOfTheStream,
    );
    this.logger.debug(
      'Top is complete and firstMessageOfTheStream is set to',
      this.firstMessageOfTheStream,
    );
    this.topHasBeenReached = true;
  }

  private setBottomIsComplete(): void {
    this.lastMessageOfTheStream = this.lastMessageOffset;
    this.logger.debug(
      'Bottom is complete and lastMessageOfTheStream is set to',
      this.lastMessageOfTheStream,
    );
    this.bottomHasBeenReached = true;
  }

  destroy(force?: boolean): void {
    this.logger.debug('Destroying message loader for channel', this.channel.data.id);
    this.httpLoading = false;
    this.collection.removeListener(this.onNewMessageFromWebsocketListener);
    if (force) {
      // This has to be used carefully: There is a big timeout on source removal: 10 seconds
      // If removed, we can not switch back to a channel before this delay.
      this.collection.removeSource(this.collectionKey);
    }
  }
}
