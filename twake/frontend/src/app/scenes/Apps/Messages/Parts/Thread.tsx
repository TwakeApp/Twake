import React from 'react';
import './Threads.scss';
import Draggable from 'components/Draggable/Draggable.js';
import UploadZone from 'components/Uploads/UploadZone.js';
import Workspaces from 'services/workspaces/workspaces.js';
import MessageEditorsManager from 'app/services/Apps/Messages/MessageEditorServiceFactory';
import { Message } from 'app/services/Apps/Messages/Message';

type Props = {
  collectionKey?: string;
  channelId?: string;
  threadId?: string;
  threadMain?: boolean;
  message?: Message;
  loading?: boolean;
  highlighted?: boolean;
  children?: any | any[];
  hidden?: boolean;
  withBlock?: boolean;
  className?: string;
  onClick?: (event: any) => void;
  canDrag?: boolean;
  allowUpload?: boolean;
};

export default (props: Props) => (
  <div
    className={
      'thread-container ' +
      (props.loading ? 'loading ' : '') +
      (props.hidden ? 'hidden ' : '') +
      (props.highlighted ? 'highlighted ' : '') +
      (props.className ? props.className + ' ' : '')
    }
    onClick={props.onClick}
  >
    {!!props.loading && (
      <div className="thread-section">
        <div className="message">
          <div className="sender-space">
            <div className="sender-head" />
          </div>
          <div className="message-content">
            <div className="message-content-header">
              <span className="sender-name"></span>
            </div>
            <div className="content-parent"></div>
            <div className="content-parent" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>
    )}
    {!props.loading && (
      <UploadZone
        className="thread-centerer"
        ref={node => {
          MessageEditorsManager.get(
            props.message?.channel_id || props.channelId || '',
          ).setUploadZone(props.message?.id || '', node);
        }}
        disableClick
        parent={''}
        driveCollectionKey={props.collectionKey}
        uploadOptions={{ workspace_id: Workspaces.currentWorkspaceId, detached: true }}
        onUploaded={(file: any) => {
          MessageEditorsManager.get(
            props.message?.channel_id || props.channelId || '',
          ).onAddAttachment(props.message?.id || '', file);
        }}
        onDragEnter={() =>
          MessageEditorsManager.get(props.message?.channel_id || props.channelId || '').openEditor(
            props.threadId || '',
            '',
            props.threadId ? '' : props.threadMain ? 'main' : '',
          )
        }
        multiple={true}
        allowPaste={true}
        disabled={
          !(
            props.allowUpload ||
            (props.message && !props.message?.parent_message_id && props.collectionKey)
          )
        }
      >
        <Draggable
          dragHandler="js-drag-handler-message"
          data={{ type: 'message', data: props.message }}
          parentClassOnDrag="dragged"
          onDragStart={(evt: any) => {}}
          minMove={10}
          className={'thread ' + (props.withBlock ? 'with-block ' : '')}
          deactivated={!(props.canDrag && props.message)}
        >
          {props.children}
        </Draggable>
      </UploadZone>
    )}
  </div>
);
