import React, { createRef, RefObject } from 'react';
import { IndexLocationWithAlign, ListRange, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import Logger from 'app/services/Logger';
import Message from './Message/MessageAndTimeSeparator';
import GoToBottom from './Parts/GoToBottom';
import { Message as MessageModel } from 'app/models/Message';
import { MessageLoader } from 'app/services/Apps/Messages/MessageLoader';
import MessageComponent from './Message/Message';
import { FeedResponse } from 'app/services/Apps/Feed/FeedLoader';
import MessageListServiceFactory from 'app/services/Apps/Messages/MessageListServiceFactory';
import { MessageListService } from 'app/services/Apps/Messages/MessageListService';
import { ChannelResource } from 'app/models/Channel';
import LockedHistoryBanner from 'app/components/LockedFeaturesComponents/LockedHistoryBanner/LockedHistoryBanner';
import InitService from 'app/services/InitService';
import _ from 'lodash';
import FirstMessage from './Message/Parts/FirstMessage/FirstMessage';

const START_INDEX = 100000;
const DEFAULT_PAGE_SIZE = 25;

type ScrollDirection = 'up' | 'down';
type ScrollPosition = 'top' | 'bottom' | 'middle' | 'unknown';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;
const LoadComponent = () => <Spin indicator={antIcon} />;
const FullPageLoaderComponent = () => (
  <div className="loading-full">
    <div className="loading">
      <LoadComponent />
    </div>
  </div>
);
const HeaderLoader = (hide: boolean) => {
  return (
    <div className="header">
      {hide ? (
        <></>
      ) : (
        <div className="loader">
          <LoadComponent />
        </div>
      )}
    </div>
  );
};
const BottomLoader = (hide: boolean) => {
  return (
    <div className="footer">
      {hide ? (
        <></>
      ) : (
        <div className="loader">
          <LoadComponent />
        </div>
      )}
    </div>
  );
};

type Props = {
  /**
   * The channel linked to the message list
   */
  channel: ChannelResource;
  /**
   * The message id to start the message list at. When not defined, start at bottom.
   */
  startAt: string;
  /**
   * When defined, display the thread, not the complete message list
   */
  threadId: string;
  collectionKey: string;
  unreadAfter: number;
  pageSize?: number;
  /**
   * The initial scroll direction
   */
  scrollDirection: ScrollDirection;
};

type State = {
  showBottomButton: boolean;
  isLoaded: boolean;
  messages: MessageModel[];
  newMessages: number;
};

export default class MessagesList extends React.Component<Props, State> {
  private logger: Logger.Logger;
  private startAt: string;
  private pageSize: number;
  private virtuosoRef: RefObject<VirtuosoHandle>;
  private scrollerRef!: HTMLElement | Window | null;
  private loading: {
    [key in ScrollDirection]: boolean;
  };
  private nbOfCalls: {
    [key in ScrollDirection]: number;
  };
  private topHasBeenReached: boolean;
  private bottomHasBeenReached: boolean;
  private firstItemIndex: number;
  private isInitialized: boolean;
  /**
   * The initial page size computed after the first fetch;
   * Since this is a reverse infinite scroll, we need to get this first size before to render the list...
   */
  private initialPageSize: number;
  private initialTopMostItemIndex: number;
  private position: ScrollPosition;
  private scrolling: boolean;
  /**
   * Locking the scroll up when we display a thread
   */
  private lockScrollUp: boolean;
  private loader!: MessageLoader;
  private service!: MessageListService;
  private previousScroll: number = 0;

  constructor(props: Props) {
    super(props);
    this.startAt = props.startAt;
    this.nbOfCalls = { up: 0, down: 0 };
    this.loading = { up: false, down: false };
    this.lockScrollUp = !!this.props.threadId;
    this.topHasBeenReached = this.lockScrollUp;
    this.bottomHasBeenReached = false;
    this.logger = Logger.getLogger(`Apps/Messages/MessageList/Channel/${props.channel.id}`);
    this.virtuosoRef = createRef();
    this.pageSize = props.pageSize || DEFAULT_PAGE_SIZE;
    this.initialTopMostItemIndex = 0;
    this.initialPageSize = this.pageSize;
    this.firstItemIndex = START_INDEX;
    this.position = 'unknown';
    this.isInitialized = false;
    this.scrolling = false;
    this.state = {
      showBottomButton: false,
      newMessages: 0,
      isLoaded: false,
      messages: [],
    };

    this.onNewCollectionEvent = this.onNewCollectionEvent.bind(this);
  }

  async componentDidMount() {
    this.service = MessageListServiceFactory.get(this.props.collectionKey, this.props.channel);
    this.loader = this.service.getLoader(this.props.threadId);
    this.service.setScroller(this.scrollToMessage.bind(this));

    if (this.startAt) {
      this.service.hightlight = this.startAt;
    }

    const startFrom = this.startAt || this.props.threadId || '';
    const direction = startFrom ? 'down' : 'up';

    await this.init({ startFrom, direction });
    this.setState({ isLoaded: true });
  }

  componentWillUnmount(): void {
    this.cleanup();
  }

  private async init(params: { startFrom: string; direction: ScrollDirection }): Promise<void> {
    const initResponse = await this.initLoader(params);
    this.processLoaderResponse(initResponse, params.direction);
    this.initialPageSize = this.state.messages.length || this.pageSize;
    if (params.direction === 'up') {
      // Set the initial index at bottom on first load when loading the feed from the end
      // TODO: In case we want to start at a given position (first unread for example), we can change the value here
      this.initialTopMostItemIndex = this.state.messages.length;
    } else {
      // when loading the feed at a given message, keep the initial index at the start
      this.initialTopMostItemIndex = 0;
    }
    this.isInitialized = true;
    this.loader.addListener(this.onNewCollectionEvent);
  }

  private cleanup(): void {
    this.loader.destroy();
    this.loader.removeListener(this.onNewCollectionEvent);
  }

  private initLoader(params: {
    startFrom: string;
    direction: ScrollDirection;
  }): Promise<FeedResponse<MessageModel>> {
    this.logger.debug('Initializing message list feed with parameters', params);
    this.loading = { down: false, up: false };
    this.nbOfCalls = { up: 0, down: 0 };
    this.previousScroll = 0;
    return this.loader.init({
      offset: params.startFrom,
      pageSize: this.pageSize,
      direction: params.direction,
    });
  }

  /**
   * The collection has been updated, update the items to dispatch a new render
   */
  private onNewCollectionEvent(_data: any): void {
    const messages = this.loader.getItems() || [];
    const diff = messages.length - this.state.messages.length;

    if (diff === 0) {
      this.logger.debug('Some Messages have been updated');
      // or some has been deleted and created at the same time...
      // or this is a response to a thread and so there are no items length diff
    } else if (diff > 0) {
      this.setState({ newMessages: diff });
      this.logger.debug(`${diff} new messages`);
    } else if (diff < 0) {
      this.logger.debug(`${diff} less messages`);
    }

    if (messages.length) {
      const previousPosition = this.position;
      this.setMessages(messages);

      if (['bottom', 'unknown'].includes(previousPosition)) {
        this.scrollToMessage('end');
      }
    }
  }

  /**
   * Called with true when the list reaches bottom, or with false when was at the bottom and starting scrolling up
   *
   * @param atBottom
   */
  private onBottomUpdate(atBottom: boolean): void {
    this.position = atBottom ? 'bottom' : 'middle';
    const scrollTop = this.scrollerRef ? (this.scrollerRef as HTMLElement).scrollTop : 0;

    if (atBottom) {
      this.previousScroll = scrollTop;
      this.setState({ showBottomButton: false });
      return;
    }

    // do not display the bottom button until the user scrolled up
    if (this.previousScroll <= scrollTop) {
      this.previousScroll = scrollTop;
      return;
    }

    this.previousScroll = scrollTop;
    this.setState({ showBottomButton: true, newMessages: 0 });
  }

  private async nextPage(direction: ScrollDirection = 'up'): Promise<void> {
    this.logger.debug(`nextPage:${direction}`);
    if (this.loading[direction]) {
      this.logger.debug(`nextPage:${direction} - Loading already in progress`);
      return;
    }

    if (!this.isInitialized) {
      this.logger.debug(`nextPage:${direction} - Not initialized`);
      return;
    }

    if (this.lockScrollUp && direction === 'up') {
      this.logger.debug(`nextPage:${direction} - Scroll up is not allowed`);
      return;
    }

    if (direction === 'up' && this.topHasBeenReached) {
      this.logger.debug(`nextPage:${direction} - Top has already been reached`);
      return;
    }

    if (direction === 'down' && this.bottomHasBeenReached) {
      this.logger.debug(`nextPage:${direction} - Bottom has already been reached`);
      return;
    }

    this.loading[direction] = true;
    const response = await this.loader.nextPage({ direction });
    this.loading[direction] = false;

    this.processLoaderResponse(response, direction);
  }

  private processLoaderResponse(
    response: FeedResponse<MessageModel>,
    direction: ScrollDirection,
  ): void {
    this.logger.debug(`processLoaderResponse:${direction} - Loader response`, response);

    if (!response.loaded) {
      this.logger.debug('processLoaderResponse - No messages loaded');
    }

    this.nbOfCalls[direction]++;
    this.topHasBeenReached = response.completes.top;
    this.bottomHasBeenReached = response.completes.bottom;

    let messages = response.items || [];

    if (!messages.length) {
      this.logger.debug('processLoaderResponse - No messages in the feed response');
      return;
    }

    if (direction === 'up') {
      // last item of the response is the same as the first one of the state (we paginated from it and it may be included in the response)
      if (
        this.state.messages.length &&
        messages[messages.length - 1].id === this.state.messages[0].id
      ) {
        messages.splice(messages.length - 1, 1);
      }

      this.firstItemIndex = this.firstItemIndex - messages.length;
      this.setMessages([...messages, ...this.state.messages]);
    }

    if (direction === 'down') {
      // first item of the page if the same as the last one of the state (we paginated from it and it may be included in the response)
      if (
        this.state.messages.length &&
        messages[0].id === this.state.messages[this.state.messages.length - 1].id
      ) {
        messages.shift();
      }
      this.setMessages([...this.state.messages, ...messages]);
    }

    this.service.markChannelAsRead(true);
  }

  /**
   * Scroll to a given message (if it exists in the state). If not defined, scroll to bottom
   *
   * @param align
   * @param message
   * @returns true when message has been found and when scroll has been asked.
   */
  scrollToMessage(align: 'start' | 'center' | 'end' = 'start', message?: MessageModel): boolean {
    const indexLocation: IndexLocationWithAlign = {
      align,
      behavior: 'smooth',
      index: this.state.messages.length,
    };

    if (!message) {
      this.setState(() => ({ newMessages: 0 }));
    } else {
      indexLocation.index = this.state.messages.findIndex(m => m.id === message.id);
    }

    if (indexLocation.index < 0) {
      return false;
    }

    this.virtuosoRef.current?.scrollToIndex(indexLocation);
    return true;
  }

  /**
   * If we loaded the feed from an offset and not reached the end, we choose to reload everything from bottom
   * else just just down...
   */
  async scrollToBottom(): Promise<boolean> {
    return this.startAt && !this.bottomHasBeenReached
      ? await this.loadAtBottom()
      : this.scrollToMessage('end');
  }

  /**
   * Reload everything at the bottom of the stream.
   * This is used when the user opens the stream at a given offset, and want to scroll to the last message.
   */
  private async loadAtBottom(): Promise<boolean> {
    this.logger.debug('Reload the page at the bottom');
    this.startAt = '';
    this.firstItemIndex = START_INDEX;
    this.initialTopMostItemIndex = 0;
    this.cleanup();
    this.loader.reset(true);
    this.setState({
      showBottomButton: false,
      newMessages: 0,
      isLoaded: false,
      messages: [],
    });

    await this.init({ direction: 'up', startFrom: '' });
    await this.nextPage('up');
    this.setState({ isLoaded: true });

    return true;
  }

  /**
   *
   * @param isAtBottom
   * @returns true or smooth to ask to follow the output when new messages are added at the end of the list
   */
  followOuput(isAtBottom: boolean): boolean | 'smooth' {
    let result = isAtBottom;
    if (this.startAt) {
      // Do not follow until the user chose to scroll to bottom
      result = false;
    }

    return result;
  }

  isBottomMessage(message: MessageModel): boolean {
    const id = message.parent_message_id || message.id;
    const messageIndex = this.state.messages.findIndex(m => m.id === id);

    return messageIndex !== -1 && messageIndex === this.state.messages.length - 1;
  }

  /**
   *
   * @param scrolling: false when starting to scroll, true when scroll ends
   */
  isScrolling(scrolling: boolean) {
    this.scrolling = scrolling;
  }

  /**
   * Remove the highlighted message when defined and when if not in the display range anymore.
   *
   * @param range
   * @returns
   */
  onVisibleItemsChanged(range: ListRange) {
    if (this.service.hightlight) {
      const index = this.state.messages.findIndex(m => m.id === this.service.hightlight);
      const hightlight = this.firstItemIndex + index;
      if (index < 0) {
        return;
      }

      if (hightlight < range.startIndex || hightlight > range.endIndex) {
        this.service.hightlight = undefined;
      }
    }
  }

  setMessages(messages: MessageModel[] = []) {
    this.setState(() => ({
      messages: _.uniqBy(messages, m => m.id || m.front_id),
    }));
  }

  getPreviousMessage(message: MessageModel): MessageModel | undefined {
    const index = this.state.messages.findIndex(m => message.id && m.id === message.id);

    return index > 0 ? this.state.messages[index - 1] : undefined;
  }

  render() {
    return (
      <>
        {!this.state.isLoaded ? (
          <FullPageLoaderComponent />
        ) : (
          <div
            style={{ width: '100%', height: '100%' }}
            className={this.state.showBottomButton ? 'messages-list scrolled-up' : 'messages-list'}
          >
            <Virtuoso
              ref={this.virtuosoRef}
              scrollerRef={ref => (this.scrollerRef = ref)}
              overscan={{ main: 1000, reverse: 1000 }}
              firstItemIndex={this.firstItemIndex}
              initialTopMostItemIndex={this.initialTopMostItemIndex}
              data={this.state.messages}
              startReached={() => this.nextPage('up')}
              endReached={() => this.nextPage('down')}
              isScrolling={value => this.isScrolling(value)}
              followOutput={'smooth'}
              rangeChanged={range => this.onVisibleItemsChanged(range)}
              itemContent={(index: number, message: MessageModel) => {
                const deleted = message?.subtype === 'deleted' ? true : false;
                const highlight =
                  !!this.service.hightlight &&
                  !!message.id &&
                  this.service.hightlight === message.id;

                if (message?.hidden_data?.type === 'limit_channel')
                  return (
                    <LockedHistoryBanner
                      companySubscriptionUrl={
                        InitService.server_infos?.configuration?.accounts?.console
                          ?.company_subscription_url || ''
                      }
                    />
                  );

                if (message.channel_id && message?.hidden_data.type === 'init_channel') {
                  return <FirstMessage channelId={message.channel_id} />;
                }

                if (message?.hidden_data.type === 'init_thread')
                  return (
                    <MessageComponent
                      noReplies={deleted}
                      threadHeader={message?.hidden_data?.thread_id}
                      key={message?.hidden_data?.thread_id}
                      messageId={message?.hidden_data?.thread_id}
                      collectionKey={this.props.collectionKey}
                    />
                  );

                return (
                  <Message
                    deleted={deleted}
                    noReplies={deleted}
                    key={message.id || message.front_id}
                    messageId={message.id || message.front_id || ''}
                    threadHeader={this.props.threadId}
                    previousMessageId={this.getPreviousMessage(message)?.id || ''}
                    unreadAfter={this.props.unreadAfter}
                    highlighted={highlight}
                    collectionKey={this.props.collectionKey}
                    repliesAsLink={!this.props.threadId}
                  />
                );
              }}
              atBottomStateChange={atBottom => this.onBottomUpdate(atBottom)}
              atTopStateChange={atTop => {
                this.position = atTop ? 'top' : 'middle';
              }}
              components={{
                Header: () => HeaderLoader(this.lockScrollUp || this.topHasBeenReached),
                Footer: () => BottomLoader(this.bottomHasBeenReached || this.nbOfCalls.down <= 1),
              }}
            />
            <GoToBottom
              onClick={() => this.scrollToBottom()}
              newMessages={this.state.newMessages}
            />
          </div>
        )}
      </>
    );
  }
}
