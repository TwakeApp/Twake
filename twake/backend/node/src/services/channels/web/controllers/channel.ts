import { plainToClass } from "class-transformer";
import { FastifyReply, FastifyRequest } from "fastify";
import { Pagination } from "../../../../core/platform/framework/api/crud-service";
import { CrudController } from "../../../../core/platform/services/webserver/types";
import { Channel, ChannelMember, UserChannel } from "../../entities";
import { ChannelService, ChannelPrimaryKey, MemberService } from "../../provider";
import { getWebsocketInformation, getWorkspaceRooms } from "../../services/channel/realtime";
import {
  BaseChannelsParameters,
  ChannelListQueryParameters,
  ChannelParameters,
  ChannelSaveOptions,
  CreateChannelBody,
  ReadChannelBody,
  UpdateChannelBody,
} from "../types";
import { ChannelExecutionContext, WorkspaceExecutionContext } from "../../types";
import { handleError } from ".";
import {
  ResourceCreateResponse,
  ResourceDeleteResponse,
  ResourceGetResponse,
  ResourceListResponse,
  ResourceUpdateResponse,
} from "../../../../services/types";

export class ChannelCrudController
  implements
    CrudController<
      ResourceGetResponse<Channel>,
      ResourceCreateResponse<Channel>,
      ResourceListResponse<Channel>,
      ResourceDeleteResponse
    > {
  constructor(protected service: ChannelService, protected membersService: MemberService) {}

  getPrimaryKey(request: FastifyRequest<{ Params: ChannelParameters }>): ChannelPrimaryKey {
    return {
      id: request.params.id,
      company_id: request.params.company_id,
      workspace_id: request.params.workspace_id,
    };
  }

  async get(
    request: FastifyRequest<{ Params: ChannelParameters }>,
    reply: FastifyReply,
  ): Promise<ResourceGetResponse<Channel>> {
    const resource = await this.service.get(
      this.getPrimaryKey(request),
      getExecutionContext(request),
    );

    if (!resource) {
      reply.notFound(`Channel ${request.params.id} not found`);

      return;
    }

    return {
      websocket: getWebsocketInformation(resource),
      resource,
    };
  }

  async save(
    request: FastifyRequest<{ Body: CreateChannelBody; Params: ChannelParameters }>,
    reply: FastifyReply,
  ): Promise<ResourceCreateResponse<Channel>> {
    const entity = plainToClass(Channel, {
      ...request.body.resource,
      ...{
        company_id: request.params.company_id,
        workspace_id: request.params.workspace_id,
      },
    });

    try {
      const options = {
        members: request.body.options ? request.body.options.members || [] : [],
      } as ChannelSaveOptions;

      const context = getExecutionContext(request);
      const channelResult = await this.service.save(entity, options, context);

      const channelMember = new ChannelMember();
      channelMember.company_id = channelResult.entity.company_id;
      channelMember.workspace_id = channelResult.entity.workspace_id;
      channelMember.channel_id = channelResult.entity.id;
      channelMember.user_id = context.user.id;
      const memberResult = await this.membersService.save(
        channelMember,
        {},
        getChannelExecutionContext(request, channelResult.entity),
      );

      const result = channelResult;
      const resultEntity = ({
        ...channelResult.entity,
        ...{ user_member: memberResult.entity },
      } as unknown) as UserChannel;

      if (result.entity) {
        reply.code(201);
      }

      return {
        websocket: getWebsocketInformation(result.entity),
        resource: resultEntity,
      };
    } catch (err) {
      handleError(reply, err);
    }
  }

  async update(
    request: FastifyRequest<{ Body: UpdateChannelBody; Params: ChannelParameters }>,
    reply: FastifyReply,
  ): Promise<ResourceUpdateResponse<Channel>> {
    const entity = plainToClass(Channel, {
      ...request.body.resource,
      ...{
        company_id: request.params.company_id,
        workspace_id: request.params.workspace_id,
        id: request.params.id,
      },
    });

    try {
      const result = await this.service.save(entity, {}, getExecutionContext(request));

      if (result.entity) {
        reply.code(201);
      }

      return {
        websocket: getWebsocketInformation(result.entity),
        resource: result.entity,
      };
    } catch (err) {
      handleError(reply, err);
    }
  }

  async list(
    request: FastifyRequest<{
      Querystring: ChannelListQueryParameters;
      Params: BaseChannelsParameters;
    }>,
  ): Promise<ResourceListResponse<Channel>> {
    const list = await this.service.list(
      new Pagination(request.query.page_token, request.query.limit),
      { ...request.query },
      getExecutionContext(request),
    );

    return {
      ...{
        resources: list.getEntities(),
      },
      ...(request.query.websockets && {
        websockets: getWorkspaceRooms(request.params, request.currentUser),
      }),
      ...(list.page_token && {
        next_page_token: list.page_token,
      }),
    };
  }

  async delete(
    request: FastifyRequest<{ Params: ChannelParameters }>,
    reply: FastifyReply,
  ): Promise<ResourceDeleteResponse> {
    try {
      const deleteResult = await this.service.delete(
        this.getPrimaryKey(request),
        getExecutionContext(request),
      );

      if (deleteResult.deleted) {
        reply.code(204);

        return {
          status: "success",
        };
      }

      return {
        status: "error",
      };
    } catch (err) {
      handleError(reply, err);
    }
  }

  async updateRead(
    request: FastifyRequest<{ Body: ReadChannelBody; Params: ChannelParameters }>,
    reply: FastifyReply,
  ): Promise<boolean> {
    const read = request.body.value;

    try {
      const result = read
        ? await this.service.markAsRead(
            this.getPrimaryKey(request),
            request.currentUser,
            getExecutionContext(request),
          )
        : await this.service.markAsUnread(
            this.getPrimaryKey(request),
            request.currentUser,
            getExecutionContext(request),
          );
      return result;
    } catch (err) {
      handleError(reply, err);
    }
  }
}

function getExecutionContext(
  request: FastifyRequest<{ Params: BaseChannelsParameters }>,
): WorkspaceExecutionContext {
  return {
    user: request.currentUser,
    url: request.url,
    method: request.routerMethod,
    transport: "http",
    workspace: {
      company_id: request.params.company_id,
      workspace_id: request.params.workspace_id,
    },
  };
}

function getChannelExecutionContext(
  request: FastifyRequest<{ Params: ChannelParameters }>,
  channel: Channel,
): ChannelExecutionContext {
  return {
    user: request.currentUser,
    url: request.url,
    method: request.routerMethod,
    transport: "http",
    channel: {
      id: channel.id,
      company_id: channel.company_id,
      workspace_id: channel.workspace_id,
    },
  };
}
