import React, { Component } from 'react';
import { CornerDownRight } from 'react-feather';
import Languages from 'services/languages/languages.js';
import FirstMessage from './Parts/FirstMessage/FirstMessage';
import Thread from '../Parts/Thread';
import ThreadSection from '../Parts/ThreadSection';
import MessageContent from './Parts/MessageContent';
import MessagesService from 'services/Apps/Messages/Messages';
import UserService from 'services/user/UserService';
import MessageEditorsManager from 'app/services/Apps/Messages/MessageEditorServiceFactory';
import { MessageEditorService } from 'app/services/Apps/Messages/MessageEditorService';
import DroppableZone from 'components/Draggable/DroppableZone.js';
import TimeSeparator from './TimeSeparator';
import Input from '../Input/Input';
import Collections from 'app/services/Depreciated/Collections/Collections.js';
import ActivityMessage, { ActivityType } from './Parts/ChannelActivity/ActivityMessage';
import './Message.scss';
import { Message } from 'app/models/Message';

type Props = {
  fake?: boolean;
  messageId: string;
  collectionKey: string;
  highlighted?: boolean;
  style?: any;
  /**
   * Deprecated
   */
  delayRender?: boolean;
  noReplies?: boolean;
  noBlock?: boolean;
  repliesAsLink?: boolean;
  unreadAfter?: number;
  threadHeader?: string;
};

export default class MessageComponent extends Component<Props> {
  messageEditorService: MessageEditorService;
  allowUpdates: boolean = false;
  message: Message;

  constructor(props: Props) {
    super(props);

    this.getResponses = this.getResponses.bind(this);

    this.message =
      Collections.get('messages').find(props.messageId) ||
      Collections.get('messages').findByFrontId(props.messageId);

    let savedLength = 0;
    Collections.get('messages').addListener(
      this,
      [props.messageId || this.message?.front_id],
      () => {
        const length = this.getResponses().length;
        if (length !== savedLength) {
          savedLength = length;
          return true;
        }
        return false;
      },
    );

    this.messageEditorService = MessageEditorsManager.get(this.message?.channel_id || '');
    let savedCurrentEditor: string | false = '';
    this.messageEditorService.addListener(this, [], () => {
      if (
        this.messageEditorService.currentEditorMessageId === props.messageId ||
        this.messageEditorService.currentEditorThreadId === props.messageId ||
        savedCurrentEditor === props.messageId
      ) {
        savedCurrentEditor = props.messageId;
        return true;
      }
      savedCurrentEditor = '';
      return false;
    });
  }

  dropMessage(message: any) {
    MessagesService.dropMessage(message, this.message, this.props.collectionKey);
  }

  /**
   * Get the sorted (by creation_date) responses of the current message
   *
   * @returns Responses for the current message
   */
  getResponses(): Message[] {
    if (!this.message) {
      return [];
    }
    return (
      (Collections.get('messages').findBy({
        channel_id: this.message.channel_id,
        parent_message_id: this.message.id,
        _user_ephemeral: undefined,
      }) || []) as Message[]
    )
      .filter(i => !i._user_ephemeral)
      .sort((a, b) =>
        a?.hidden_data?.type === 'init_channel'
          ? -1
          : b?.hidden_data?.type === 'init_channel'
          ? 1
          : (a.creation_date || 0) - (b.creation_date || 0),
      );
  }

  render() {
    const message = this.message;
    let previous_message = message;
    const max_responses = 3;

    if (this.props.fake === true) {
      return <Thread loading />;
    }

    if (message?.hidden_data?.type === 'activity') {
      const activity = message.hidden_data.activity as ActivityType;
      return <ActivityMessage activity={activity} />;
    }

    const responses = this.getResponses();
    const linkToThread = !!message.parent_message_id && this.props.repliesAsLink;
    const showInput = this.messageEditorService.currentEditor === message?.id;
    const canDropIn =
      !message.parent_message_id && !message._user_ephemeral && message.message_type !== 2;

    return (
      <DroppableZone
        deactivated={!canDropIn}
        types={['message']}
        onDrop={(data: any) => this.dropMessage(data.data)}
      >
        <Thread
          collectionKey={this.props.collectionKey}
          threadId={message?.id || ''}
          highlighted={this.props.highlighted}
          withBlock={!message.parent_message_id && !this.props.noBlock}
          canDrag={!(this.props.repliesAsLink && message.parent_message_id)}
          message={message}
          className={canDropIn ? 'has-droppable ' : ''}
        >
          <ThreadSection small={linkToThread} message={message} head>
            <MessageContent
              key={message?._last_modified || message?.front_id}
              threadHeader={this.props.threadHeader}
              linkToThread={linkToThread}
              message={message}
              collectionKey={this.props.collectionKey}
              edited={this.messageEditorService.currentEditorMessageId === message.id}
            />
          </ThreadSection>

          {!this.props.noReplies && responses.length > max_responses && (
            <ThreadSection gradient>
              <div className="message-content">
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a
                  onClick={() => {
                    MessagesService.showMessage(message?.id);
                  }}
                  href="#"
                >
                  {Languages.t('scenes.apps.messages.message.show_responses_button')} (
                  {message.responses_count})
                </a>
              </div>
            </ThreadSection>
          )}

          {!this.props.noReplies &&
            responses.slice(-max_responses).map(message => {
              if (!message) {
                return '';
              }
              const tmp_previous_message = previous_message;
              previous_message = message;
              return [
                <TimeSeparator
                  key={message.front_id + '_time'}
                  messageId={message?.id || ''}
                  previousMessageId={tmp_previous_message?.id || ''}
                  unreadAfter={this.props.unreadAfter || 0}
                />,
                <ThreadSection canDrag alinea message={message} small key={message.front_id}>
                  <MessageContent
                    message={message}
                    collectionKey={this.props.collectionKey}
                    edited={this.messageEditorService.currentEditorMessageId === message.id}
                  />
                </ThreadSection>,
              ];
            })}

          {!this.props.noReplies && showInput && (
            <ThreadSection alinea small message={{ sender: UserService.getCurrentUserId() }}>
              <div className="message-content">
                <Input
                  channelId={message?.channel_id || ''}
                  threadId={message?.id || ''}
                  collectionKey={this.props.collectionKey}
                />
              </div>
            </ThreadSection>
          )}
          {!showInput && !this.props.noReplies && !message.parent_message_id && (
            <ThreadSection compact>
              <div className="message-content">
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a
                  href="#"
                  onClick={() => this.messageEditorService.openEditor(message?.id || '', '')}
                >
                  <CornerDownRight size={14} />{' '}
                  {Languages.t('scenes.apps.messages.message.reply_button')}
                </a>
              </div>
            </ThreadSection>
          )}
        </Thread>
      </DroppableZone>
    );
  }

  componentWillUnmount() {
    Collections.get('messages').removeListener(this);
    this.messageEditorService.removeListener(this);
  }
}
