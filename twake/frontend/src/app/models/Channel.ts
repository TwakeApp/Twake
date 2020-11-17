import { Resource } from 'services/CollectionsReact/Collections';

export type ChannelType = {
  company_id?: string;
  workspace_id?: string | null; //Null for direct messages
  type?: string;
  id?: string;
  icon?: string;
  name?: string;
  description?: string;
  channel_group?: string;
  visibility?: string;
  default?: boolean;
  direct_channel_members?: string[];
  owner?: string;
  members_count?: number;
  guests_count?: number;
  messages_count?: number;
  archived?: false | true;
  archivation_date?: number; //Timestamp
  user_member?: ChannelMemberType;
};

export type ChannelMemberType = {
  id?: string; //Equals to user-id (needed for collections)
  user_id?: string;
  type?: 'member' | 'guest' | 'bot';
  last_access?: number; //Timestamp in seconds
  last_increment?: number; //Number
  favorite?: boolean; //Did the user add this channel to its favorites
  notification_level?: 'all' | 'none' | 'group_mentions' | 'user_mentions';
};

export class ChannelResource extends Resource<ChannelType> {}

export class ChannelMemberResource extends Resource<ChannelMemberType> {}
