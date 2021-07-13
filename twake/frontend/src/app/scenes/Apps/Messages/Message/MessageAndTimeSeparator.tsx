import React from 'react';
import Message from './Message';
import TimeSeparator from './TimeSeparator';

type Props = {
  fake?: boolean;
  messageId: string;
  previousMessageId: string;
  collectionKey: string;
  highlighted?: boolean;
  style?: React.CSSProperties;
  deleted?: boolean;
  /**
   * Deprecated
   */
  delayRender?: boolean;
  noReplies?: boolean;
  noBlock?: boolean;
  repliesAsLink?: boolean;
  unreadAfter: number;
  threadHeader?: string;
};

export default React.memo((props: Props) => {
  return (
    <>
      <TimeSeparator
        key={'time'}
        messageId={props.messageId}
        previousMessageId={props.previousMessageId}
        unreadAfter={props.unreadAfter}
      />
      <Message
        deleted={props.deleted}
        noReplies={props.noReplies}
        fake={props.fake}
        repliesAsLink={props.repliesAsLink}
        key="message"
        messageId={props.messageId}
        threadHeader={props.threadHeader}
        highlighted={props.highlighted}
        collectionKey={props.collectionKey}
        unreadAfter={props.unreadAfter}
      />
    </>
  );
});
