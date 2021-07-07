import React, { Component } from 'react';

import Languages from 'services/languages/languages.js';
import MessagesService from 'services/Apps/Messages/Messages';
import ChannelsService from 'services/channels/channels.js';
import MessageList from './MessageList';
import NewThread from './Input/NewThread';
import DroppableZone from 'components/Draggable/DroppableZone.js';
import { ChannelResource } from 'app/models/Channel';
import { MessageListService } from 'app/services/Apps/Messages/MessageListService';
import MessageListServiceFactory from 'app/services/Apps/Messages/MessageListServiceFactory';
import RouterServices from 'app/services/RouterService';
import './Messages.scss';
import { ViewConfiguration } from 'app/services/AppView/AppViewService';

type Props = {
  channel: ChannelResource;
  tab?: any;
  options: ViewConfiguration;
};

type State = {
  /**
   * True when everything is ready to be displayed
   */
  ready: boolean;
};

export default class MainView extends Component<Props, State> {
  options: any = {};

  /**
   * Display a thread view when non empty
   */
  threadId = '';

  /**
   * Start at the given message id. Does not work when threadId is defined.
   */
  startAtOffset = '';
  collectionKey: string;
  upload_zone: any;
  messageService: MessageListService;

  constructor(props: Props) {
    super(props);
    Languages.addListener(this);
    ChannelsService.addListener(this);
    MessagesService.addListener(this);

    this.options = props.options || {};
    this.options.context = props.options.context || {};
    this.threadId = this.options.context.threadId || '';
    this.collectionKey = `messages@channel:${this.props.channel.id}/thread:${this.threadId}`;
    this.messageService = MessageListServiceFactory.get(this.collectionKey, this.props.channel);
    this.state = {
      ready: false,
    };
  }

  componentDidMount(): void {
    this.startAtOffset = RouterServices.getStateFromRoute().messageId || '';
    if (this.startAtOffset) {
      // this is something quite weird but there are no way to do it another way...
      RouterServices.history.replace({ search: '' });
    }
    this.setState({ ready: true });
  }

  componentWillUnmount() {
    Languages.removeListener(this);
    ChannelsService.removeListener(this);
    MessagesService.removeListener(this);
    this.setState({ ready: false });
  }

  render() {
    const unreadAfter = this.props.channel.data.user_member?.last_access || new Date().getTime();

    return this.state.ready ? (
      <div className="messages-view" onClick={() => this.messageService.markChannelAsRead()}>
        <MessageList
          startAt={this.startAtOffset}
          threadId={this.threadId}
          channel={this.props.channel}
          collectionKey={this.collectionKey}
          unreadAfter={unreadAfter}
          scrollDirection={this.threadId ? 'down' : 'up'}
        />
        <DroppableZone
          className="bottom_input"
          types={['message']}
          onDrop={(data: any) => MessagesService.dropMessage(data.data, null, this.collectionKey)}
        >
          <NewThread
            useButton={this.props.channel.data.visibility !== 'direct' && !this.threadId}
            collectionKey={this.collectionKey}
            channelId={this.props.channel.id}
            threadId={this.threadId}
          />
        </DroppableZone>
      </div>
    ) : (
      <></>
    );
  }
}
