export type ReactionType = { name: string; count: number; users: string[] };

export type Message = {
  id?: string;
  application_id?: string | null;
  channel_id?: string;
  content?: any;
  creation_date?: number;
  edited?: boolean;
  front_id?: string;
  hidden_data?: any;
  increment_at_time?: number | null;
  message_type?: 0 | 1 | 2;
  modification_date?: number;
  parent_message_id?: string | null;
  pinned?: boolean;
  reactions?: ReactionType[];
  responses_count?: number | null;
  sender?: string | null;
  user_specific_content?: any;
  _user_ephemeral?: any;
  _last_modified?: string;
  _user_reaction?: any;
  subtype?:
    | null
    | 'application' //Message from a connector
    | 'deleted' //Message deleted by user
    | 'system';
};
