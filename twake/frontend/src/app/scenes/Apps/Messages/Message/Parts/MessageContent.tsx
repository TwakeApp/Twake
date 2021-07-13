import React, { useState } from 'react';
import 'moment-timezone';
import classNames from 'classnames';
import Twacode from 'components/Twacode/Twacode';
import MessagesService from 'services/Apps/Messages/Messages';
import Reactions from './Reactions';
import Options from './Options';
import MessageHeader from './MessageHeader';
import WorkspacesApps from 'services/workspaces/workspaces_apps.js';
import MessageEdition from './MessageEdition';
import Collections from 'app/services/Depreciated/Collections/Collections.js';
import { Message } from 'app/models/Message';
import DeletedContent from './DeletedContent';

type Props = {
  message: Message;
  collectionKey: string;
  linkToThread?: boolean;
  edited?: boolean;
  threadHeader?: string;
  deleted?: boolean;
};

export default (props: Props) => {
  const [active, setActive] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  let loading_interaction_timeout: any = 0;

  Collections.get('messages').useListener(useState, [
    props.message?.id,
    props.message?.front_id,
    'msgcontent',
  ]);

  const onInteractiveMessageAction = (action_id: string, context: any, passives: any, evt: any) => {
    var app_id = props.message.application_id;
    var type = 'interactive_message_action';
    var event = action_id;
    var data = {
      interactive_context: context,
      form: passives,
      message: props.message,
    };
    WorkspacesApps.notifyApp(app_id, type, event, data);
  };

  const onAction = (type: string, id: string, context: any, passives: any, evt: any) => {
    if (type === 'interactive_action') {
      setLoadingAction(true);
      clearTimeout(loading_interaction_timeout);
      loading_interaction_timeout = setTimeout(() => {
        setLoadingAction(false);
      }, 5000);
      onInteractiveMessageAction(id, context, passives, evt);
    }
  };

  const showEdition = !props.linkToThread && props.edited;

  return (
    <div
      className={classNames('message-content', {
        active,
        'loading-interaction': loadingAction,
        'link-to-thread': props.linkToThread,
      })}
      onClick={() => setActive(false)}
    >
      {!props?.deleted && (
        <MessageHeader
          message={props.message}
          collectionKey={props.collectionKey}
          linkToThread={props.linkToThread}
        />
      )}
      {!!showEdition && !props?.deleted && (
        <div className="content-parent">
          <MessageEdition
            message={props.message}
            collectionKey={props.collectionKey}
            onDeleted={() => console.log('Message has been deleted')}
            onEdited={() => console.log('Message has been edited')}
          />
        </div>
      )}
      {!showEdition && (
        <div className="content-parent dont-break-out">
          {props?.deleted === true ? (
            <div className="content-parent dont-break-out">
              <DeletedContent userId={props.message.sender || ''} />
            </div>
          ) : (
            <>
              <Twacode
                className="content allow_selection"
                content={MessagesService.prepareContent(
                  props.message.content,
                  props.message.user_specific_content,
                )}
                isApp={props.message.message_type === 1}
                after={
                  props.message.edited &&
                  props.message.message_type === 0 && <div className="edited">(edited)</div>
                }
                simple={props.linkToThread}
                onAction={(type: string, id: string, context: any, passives: any, evt: any) =>
                  onAction(type, id, context, passives, evt)
                }
              />
              <Reactions message={props.message} collectionKey={props.collectionKey} />
            </>
          )}
        </div>
      )}
      {!showEdition && !props?.deleted && (
        <Options
          message={props.message}
          collectionKey={props.collectionKey}
          onOpen={() => setActive(true)}
          onClose={() => setActive(false)}
          threadHeader={props.threadHeader}
        />
      )}
    </div>
  );
};
