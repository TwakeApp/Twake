import DepreciatedCollections from 'app/services/Depreciated/Collections/Collections';
import Numbers from 'services/utils/Numbers';
import Observable from 'app/services/Depreciated/observable';
import Notifications from 'services/user/notifications';
import { ChannelResource } from 'app/models/Channel';
import Collections from 'app/services/CollectionsReact/Collections';
import logger from 'app/services/Logger';
import { Message } from './Message';
import { FeedListeners, FeedLoader, NextParameters, FeedResponse } from '../Feed/FeedLoader';

const DEFAULT_PAGE_SIZE = 25;

/*
  This class will manage what is loaded from the backend and what's not, the complete list of messages for a channel will always be h
*/
export class MessageLoader extends Observable implements FeedLoader<Message> {
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
   * Last message of the stream. Its value can change if new messages are created
   */
  private lastMessageOfTheStream = '';

  /**
   * Last message of the feed, this is the one which has the bigger creation date | timeuuid (ie the younger)
   */
  private lastMessageId: string = '';
  private didInit = false;
  private destroyed = false;
  private httpLoading = false;

  // FIXME: Move it to the channel related service
  private readChannelTimeout: any;
  private lastReadMessage: string = '';

  private listeners: FeedListeners<Message> | undefined;

  constructor(
    private companyId: string = '',
    private workspaceId: string = '',
    private channelId: string = '',
    private threadId: string = '',
    private collectionKey: string,
  ) {
    super();
    this.onNewMessageFromWebsocketListener = this.onNewMessageFromWebsocketListener.bind(this);
  }

  async init(params: { offset?: string, pageSize?: number } = {}, listeners?: FeedListeners<Message>): Promise<unknown> {
    this.pageSize = params.pageSize || DEFAULT_PAGE_SIZE;
    this.listeners = listeners;
    DepreciatedCollections.get('messages').addListener(this.onNewMessageFromWebsocketListener);

    if (!this.destroyed && this.didInit && params.offset) {
      // we are back from another page, we are already initialized, so we restart things fro the start
      this.reset(true);
      return this.nextPage({ offset: params.offset, direction: params.offset ? 'down' : 'up' });
    }
    
    if (this.httpLoading) {
      logger.warn("Init in progress, skipping");
      return;
    }

    // TODO: When channel is reopened; we must call next page first
    return new Promise<void>(resolve => {
      if (!this.didInit) {
        this.httpLoading = true;
      }
      if (this.destroyed) {
        this.destroyed = false;
        resolve();
      }

      DepreciatedCollections.get('messages').addSource(
        {
          http_base_url: 'discussion',
          http_options: {
            channel_id: this.channelId,
            company_id: this.companyId,
            workspace_id: this.workspaceId,
            parent_message_id: this.threadId,
            limit: this.pageSize,
            offset: false,
          },
          websockets: [{ uri: `messages/${this.channelId}`, options: { type: 'messages' } }],
        },
        this.collectionKey,
        // First load callback
        (messages: Message[]) => {
          this.httpLoading = false;
          this.updateCursors(messages, true);
          // FIXME: Add the no offset condition here
          if (!params.offset) {
            // without any offset, we loaded all the bottom messages on this first call
            this.setBottomIsComplete();
          }

          if (messages[0]?.hidden_data?.type === 'init_channel' || messages.length < this.pageSize) {
            this.setTopIsComplete()
          }

          // bottom reached?
          if (!params.offset && messages.length < this.pageSize) {
            this.setBottomIsComplete();
          }

          this.notify();
          this.didInit = true;

          resolve();
        },
      );
    }).then(() => {
      this.onNewMessageFromWebsocketListener(null);
      return new Promise(resolve => resolve(null));
    });
  }

  async nextPage(params: NextParameters = { direction: 'up' }): Promise<FeedResponse<Message>> {
    logger.debug("nextPage - ", params);
    if (!this.didInit) {
      throw new Error("Loader must be initialized first");
    }
    const loadUp = params.direction === 'up';

    if (this.httpLoading) {
      logger.debug("nextPage - HTTP is already ongoing");

      return this.buildResponse([], false, params);
    }

    const offset = params.offset ? params.offset : (loadUp ? this.firstMessageOffset : this.lastMessageOffset);

    if (
      (loadUp && offset && this.firstMessageOfTheStream && this.firstMessageOfTheStream === offset) ||
      (!loadUp && offset && this.lastMessageOfTheStream && this.lastMessageOfTheStream === offset)
    ) {
      logger.debug('nextPage - Trying to load messages at same offset than first || last message', 'params=', params, 'offset=', offset, 'firstMessageOfTheStream=', this.firstMessageOfTheStream, 'lastMessageOfTheStream=', this.lastMessageOfTheStream);

      return this.buildResponse(this.getItems(), false, params);
    }

    return new Promise(resolve => {
      this.httpLoading = true;
      DepreciatedCollections.get('messages').sourceLoad(
        this.collectionKey,
        {
          offset,
          limit: (loadUp ? 1 : -1) * this.pageSize,
        },
        (messages: Message[]) => {
          this.httpLoading = false;
          // HERE
          this.updateCursors(messages, !!params.offset);
          if (loadUp && messages.length < this.pageSize) {
            this.setTopIsComplete();
          }
          if (!loadUp && messages.length < this.pageSize) {
            this.setBottomIsComplete();
          }
          this.notify();
          resolve(this.buildResponse(this.getItems(), true, params));
        },
      );
    });
  }

  private buildResponse(items: Message[], loaded: boolean, params: NextParameters): FeedResponse<Message> {
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
    };
  }

  /**
   * Get last loaded messages without holes between messages
   *
   * @returns a list messages between first and last cursors
   */
  getItems(): Message[] {
    if (this.lastMessageOffset === this.firstMessageOffset && this.httpLoading) {
      return [];
    }

    const filter: any = {
      channel_id: this.channelId,
    };
    if (this.threadId) {
      filter.parent_message_id = this.threadId;
    }
    let messages: Message[] = DepreciatedCollections.get('messages').findBy(filter);

    // TODO: Do we need this?
    //this.detectNewWebsocketsMessages(messages);

    messages = messages
      // keep only the messages between the first and last loaded ones 
      .filter(message => (
        Numbers.compareTimeuuid(this.lastMessageOffset, message.id) >= 0 &&
        Numbers.compareTimeuuid(this.firstMessageOffset, message.id) <= 0
      ))
      // remove ephemeral messages
      .filter(message => !message._user_ephemeral)
      // sort them by creation date
      .sort((a, b) => (a?.creation_date || 0) - (b?.creation_date || 0));

    if (!this.threadId) {
      let lastParentId = '';
      messages = messages.filter(message => {
        if (message.parent_message_id) {
          return (
            lastParentId &&
            lastParentId !== message.parent_message_id &&
            Numbers.compareTimeuuid(message.parent_message_id, message.id) <= 0
          )
          ? true : false;
        } else {
          lastParentId = message.id || '';
        }
        return true;
      });
    }

    // FIXME: This should not be in this service but in a listener in the channel component
    if (this.hasLastMessage() && document.hasFocus()) {
      this.readChannelOrThread();
    }

    return messages;
  }

  /**
   * Updates the last message of the feed with the given one if and only if it is newer than the previous one
   * TODO: We have to distinguosh the last message block with the last youger message, this is not the same...
   *
   * @param message
   * @returns 
   */
  private setLastMessageId(message: Message): void {
    if (!message || !message.id) {
      return;
    }

    if (!this.lastMessageId) {
      this.lastMessageId = message.id;
    } else {
      this.lastMessageId = Numbers.compareTimeuuid(this.lastMessageId, message.id) <= 0 ? message.id : this.lastMessageId;
    }
  }

  hasLastMessage(): boolean {
    return !!this.lastMessageOfTheStream;
  }

  detectNewWebsocketsMessages(messages: Message[]): Message[] {
    const newUnknownMessages: Message[] = [];

    messages.forEach(m => {
      if (Numbers.compareTimeuuid(this.lastMessageId, m.id) < 0) {
        newUnknownMessages.push(m);
      }
    });

    newUnknownMessages.forEach(m => this.onNewMessageFromWebsocket(m));

    return newUnknownMessages;
  }

  onNewMessageFromWebsocketListener(_event: any) {
    const newMessages = this.detectNewWebsocketsMessages(
      DepreciatedCollections.get('messages').findBy({
        channel_id: this.channelId,
      }),
    );
    logger.debug("New messages from websocket", newMessages);
    if (newMessages) {
      this.listeners && this.listeners.onCreated && this.listeners.onCreated(newMessages);
    }
    this.notify();
  }

  onNewMessageFromWebsocket(message: Message) {
    // TODO: Check me
    if (this.lastMessageOffset === this.lastMessageOfTheStream) {
      this.updateCursors([message]);
    }
  }

  reset(force?: boolean) {
    this.firstMessageOffset = '';
    this.lastMessageOffset = '';
    this.lastMessageId = '';
    if (force) {
      this.firstMessageOfTheStream = '';
      this.lastMessageOfTheStream = '';
      this.topHasBeenReached = false;
      this.bottomHasBeenReached = false;
    }
  }

  private updateCursors(messages: Message[] = [], reset: boolean = false) {
    logger.debug("Updating pagination cursors with messages", messages.length, reset);
    if (reset) {
      this.reset();
    }

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
      this.lastMessageOffset = Numbers.maxTimeuuid(this.lastMessageOffset, m.id);
      this.firstMessageOffset = Numbers.minTimeuuid(this.firstMessageOffset, m.id);
    });

    if (wasAtEnd) {
      this.lastMessageOfTheStream = Numbers.maxTimeuuid(
        this.lastMessageOfTheStream,
        this.lastMessageOffset,
      );
    }
    this.printCursors();
  }

  private printCursors() {
    logger.debug(`Cursors:
      firstMessageOffset: ${this.firstMessageOffset},
      lastMessageOffset: ${this.lastMessageOffset},
      lastMessageOfTheStream: ${this.lastMessageOfTheStream},
    `);
  }

  private setTopIsComplete(): void {
    this.firstMessageOfTheStream = Numbers.minTimeuuid(
      this.firstMessageOffset,
      this.firstMessageOfTheStream,
    );
    this.topHasBeenReached = true;
  }

  private setBottomIsComplete(): void {
    this.lastMessageOfTheStream = this.lastMessageOffset;
    this.bottomHasBeenReached = true;
  }

  destroy() {
    this.destroyed = true;
    this.httpLoading = false;

    DepreciatedCollections.get('messages').removeSource(this.collectionKey);
    DepreciatedCollections.get('messages').removeListener(this.onNewMessageFromWebsocketListener);
  }

  readChannelOrThread() {
    if (this.readChannelTimeout) {
      clearTimeout(this.readChannelTimeout);
    }
    if (this.lastReadMessage === this.lastMessageOffset) {
      return;
    }
    this.readChannelTimeout = setTimeout(() => {
      const path = `/channels/v1/companies/${this.companyId}/workspaces/${this.workspaceId}/channels/::mine`;
      const collection = Collections.get(path, ChannelResource);
      const channel = collection.findOne({ id: this.channelId }, { withoutBackend: true });
      this.lastReadMessage = this.lastMessageOffset;
      Notifications.read(channel);
    }, 500);
  }
}
