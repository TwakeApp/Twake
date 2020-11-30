import {
  CRUDService,
  ListResult,
  Pagination,
} from "../../core/platform/framework/api/crud-service";
import { TwakeServiceProvider, Initializable } from "../../core/platform/framework/api";
import { Channel, ChannelMember, ChannelMemberPrimaryKey } from "./entities";
import { ChannelExecutionContext, WorkspaceExecutionContext } from "./types";
import User from "../user/entity/user";
import { DirectChannel } from "./entities/direct-channel";

export type ChannelPrimaryKey = {
  id?: string;
  company_id?: string;
  workspace_id?: string;
};

export interface ChannelService
  extends TwakeServiceProvider,
    Initializable,
    CRUDService<Channel, ChannelPrimaryKey, WorkspaceExecutionContext> {
  /**
   * Create direct channel
   *
   * @param directChannel
   */
  createDirectChannel(directChannel: DirectChannel): Promise<DirectChannel>;

  /**
   * Get all the direct channels for a user
   * TODO: Return a list of Channel with a list of users
   * @param user
   */
  getDirectChannel(directChannel: DirectChannel): Promise<DirectChannel>;

  /**
   * Get a direct channel in company for given company id and set of users
   */
  getDirectChannelInCompany(companyId: string, users: string[]): Promise<DirectChannel>;

  /**
   * List direct channels in company from a list of channel ids
   *
   * @param companyId
   * @param channelIds
   */
  listDirectChannels(companyId: string, channelIds: string[]): Promise<DirectChannel[]>;
}
export interface MemberService
  extends TwakeServiceProvider,
    Initializable,
    CRUDService<ChannelMember, ChannelMemberPrimaryKey, ChannelExecutionContext> {
  listUserChannels(
    user: User,
    pagination: Pagination,
    context: WorkspaceExecutionContext,
  ): Promise<ListResult<ChannelMember>>;
}

export default interface ChannelServiceAPI extends TwakeServiceProvider, Initializable {
  channels: ChannelService;
  members: MemberService;
}
