import React from 'react';
import Languages from 'services/languages/languages.js';
import { ArrowDown } from 'react-feather';

type Props = {
  onClick: () => void;
};

export default (props: Props) => {
  return (
    <div
      className={'go-to-bottom'}
      key="go-to-bottom"
      onClick={ () => props.onClick() }
    >
      <ArrowDown size={16} />{' '}
      {Languages.t('scenes.apps.messages.messageslist.go_last_message_button')}
    </div>
  );
};
