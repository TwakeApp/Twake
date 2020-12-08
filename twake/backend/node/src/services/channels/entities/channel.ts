import { Type } from "class-transformer";
import { ChannelVisibility, ChannelType } from "../types";
import { ChannelMember } from "./channel-member";

export class Channel {
  // uuid-v4
  @Type(() => String)
  company_id: string;

  @Type(() => String)
  workspace_id: string | ChannelType.DIRECT;

  @Type(() => String)
  id: string;

  name: string;

  icon: string;

  description: string;

  channel_group: string;

  visibility: ChannelVisibility;

  is_default: boolean;

  archived: boolean;

  archivation_date: number;

  // uuid
  @Type(() => String)
  owner: string;

  members: string[] = [];

  connectors: string[] = []; //list of app-ids
}

export class UserChannel extends Channel {
  user_member: ChannelMember;
}

export class UserDirectChannel extends UserChannel {
  direct_channel_members: string[];
}
