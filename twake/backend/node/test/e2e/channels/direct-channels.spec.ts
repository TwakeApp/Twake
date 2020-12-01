import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import { v4 as uuidv4 } from "uuid";
import { deserialize } from "class-transformer";
import { TestPlatform, init } from "../setup";
import {
  ChannelCreateResponse,
  ChannelGetResponse,
  ChannelListResponse,
  ChannelSaveOptions,
} from "../../../src/services/channels/web/types";
import ChannelServiceAPI from "../../../src/services/channels/provider";
import { Channel } from "../../../src/services/channels/entities/channel";
import { ChannelVisibility } from "../../../src/services/channels/types";
import { WorkspaceExecutionContext } from "../../../src/services/channels/types";
import { User, Workspace } from "../../../src/services/types";
import { ChannelUtils, get as getChannelUtils } from "./utils";
import { DirectChannel } from "../../../src/services/channels/entities/direct-channel";

describe.only("The direct channels API", () => {
  const url = "/internal/services/channels/v1";
  let platform: TestPlatform;
  let channelUtils: ChannelUtils;

  beforeEach(async () => {
    platform = await init({
      services: ["websocket", "webserver", "channels", "auth", "database"],
    });
    channelUtils = getChannelUtils(platform);
  });

  afterEach(async () => {
    await platform.tearDown();
    platform = null;
  });

  function getContext(user?: User): WorkspaceExecutionContext {
    return {
      workspace: platform.workspace,
      user: user || platform.currentUser,
    };
  }

  describe("Channel List - GET /channels", () => {
    it.only("should return empty list of direct channels", async done => {
      const jwtToken = await platform.auth.getJWTToken();
      const response = await platform.app.inject({
        method: "GET",
        url: `${url}/companies/${platform.workspace.company_id}/workspaces/direct/channels`,
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      });

      const result: ChannelListResponse<Channel> = deserialize(ChannelListResponse, response.body);

      expect(response.statusCode).toBe(200);
      expect(result.resources.length).toEqual(0);

      done();
    });

    it("should return list of direct channels the user is member of", async done => {
      const channelService = platform.platform.getProvider<ChannelServiceAPI>("channels");
      const channel = channelUtils.getChannel();
      const directChannelIn = channelUtils.getDirectChannel();
      const directChannelNotIn = channelUtils.getDirectChannel();
      const members = [platform.currentUser.id, uuidv4()];
      const directWorkspace: Workspace = {
        company_id: platform.workspace.company_id,
        workspace_id: ChannelVisibility.DIRECT,
      };

      const creationResult = await Promise.all([
        channelService.channels.save(channel, {}, getContext()),
        channelService.channels.save<ChannelSaveOptions>(
          directChannelIn,
          {
            members,
          },
          { ...getContext(), ...{ workspace: directWorkspace } },
        ),
        channelService.channels.save<ChannelSaveOptions>(
          directChannelNotIn,
          {
            members: [uuidv4(), uuidv4(), uuidv4()],
          },
          { ...getContext(), ...{ workspace: directWorkspace } },
        ),
      ]);

      const jwtToken = await platform.auth.getJWTToken();
      const directResponse = await platform.app.inject({
        method: "GET",
        url: `${url}/companies/${platform.workspace.company_id}/workspaces/direct/channels`,
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      });

      const directResult: ChannelListResponse<Channel> = deserialize(
        ChannelListResponse,
        directResponse.body,
      );

      expect(directResponse.statusCode).toBe(200);
      expect(directResult.resources.length).toEqual(1);
      expect(directResult.resources[0]).toMatchObject({
        id: creationResult[1].entity.id,
        workspace_id: ChannelVisibility.DIRECT,
        user_member: {
          user_id: platform.currentUser.id,
        },
        direct_channel_members: members,
      });

      const response = await platform.app.inject({
        method: "GET",
        url: `${url}/companies/${platform.workspace.company_id}/workspaces/${platform.workspace.workspace_id}/channels`,
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      });

      const result: ChannelListResponse<Channel> = deserialize(ChannelListResponse, response.body);

      expect(response.statusCode).toBe(200);
      expect(result.resources.length).toEqual(1);
      expect(result.resources[0]).toMatchObject({
        id: creationResult[0].entity.id,
      });

      done();
    });

    it("should not return direct channels in workspace list", async done => {
      const channelService = platform.platform.getProvider<ChannelServiceAPI>("channels");
      const channel = channelUtils.getChannel();
      const directChannelIn = channelUtils.getDirectChannel();
      const directChannelNotIn = channelUtils.getDirectChannel();
      const members = [platform.currentUser.id, uuidv4()];
      const directWorkspace: Workspace = {
        company_id: platform.workspace.company_id,
        workspace_id: ChannelVisibility.DIRECT,
      };

      const creationResult = await Promise.all([
        channelService.channels.save(channel, {}, getContext()),
        channelService.channels.save<ChannelSaveOptions>(
          directChannelIn,
          {
            members,
          },
          { ...getContext(), ...{ workspace: directWorkspace } },
        ),
        channelService.channels.save<ChannelSaveOptions>(
          directChannelNotIn,
          {
            members: [uuidv4(), uuidv4(), uuidv4()],
          },
          { ...getContext(), ...{ workspace: directWorkspace } },
        ),
      ]);

      const jwtToken = await platform.auth.getJWTToken();
      const response = await platform.app.inject({
        method: "GET",
        url: `${url}/companies/${platform.workspace.company_id}/workspaces/${platform.workspace.workspace_id}/channels`,
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      });

      const result: ChannelListResponse<Channel> = deserialize(ChannelListResponse, response.body);

      expect(response.statusCode).toBe(200);
      expect(result.resources.length).toEqual(1);
      expect(result.resources[0]).toMatchObject({
        id: creationResult[0].entity.id,
      });
      expect(result.resources[0].visibility).not.toEqual(ChannelVisibility.DIRECT);

      done();
    });

    it("should not return direct channels in workspace list with mine parameter", async done => {
      const channelService = platform.platform.getProvider<ChannelServiceAPI>("channels");
      const channel = channelUtils.getChannel();
      const directChannelIn = channelUtils.getDirectChannel();
      const directChannelNotIn = channelUtils.getDirectChannel();
      const members = [platform.currentUser.id, uuidv4()];
      const directWorkspace: Workspace = {
        company_id: platform.workspace.company_id,
        workspace_id: ChannelVisibility.DIRECT,
      };

      await Promise.all([
        channelService.channels.save(channel, {}, getContext()),
        channelService.channels.save<ChannelSaveOptions>(
          directChannelIn,
          {
            members,
          },
          { ...getContext(), ...{ workspace: directWorkspace } },
        ),
        channelService.channels.save<ChannelSaveOptions>(
          directChannelNotIn,
          {
            members: [uuidv4(), uuidv4(), uuidv4()],
          },
          { ...getContext(), ...{ workspace: directWorkspace } },
        ),
      ]);

      const jwtToken = await platform.auth.getJWTToken();
      const response = await platform.app.inject({
        method: "GET",
        url: `${url}/companies/${platform.workspace.company_id}/workspaces/${platform.workspace.workspace_id}/channels`,
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
        query: {
          mine: "true",
        },
      });

      const result: ChannelListResponse<Channel> = deserialize(ChannelListResponse, response.body);

      expect(response.statusCode).toBe(200);
      expect(result.resources.length).toEqual(0);

      done();
    });
  });

  describe("Create direct channel - POST /channels", () => {
    it("should be able to create a direct channel with members", async done => {
      const jwtToken = await platform.auth.getJWTToken();
      const channelService = platform.platform.getProvider<ChannelServiceAPI>("channels");
      const members = [uuidv4(), platform.currentUser.id];

      const response = await platform.app.inject({
        method: "POST",
        url: `${url}/companies/${platform.workspace.company_id}/workspaces/direct/channels`,
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
        payload: {
          options: {
            members,
          },
          resource: {
            description: "A direct channel description",
            visibility: "direct",
          },
        },
      });

      expect(response.statusCode).toEqual(201);

      const channelCreateResult: ChannelGetResponse<Channel> = deserialize(
        ChannelCreateResponse,
        response.body,
      );

      expect(channelCreateResult.resource).toBeDefined();

      const createdChannel = await channelService.channels.get({
        id: channelCreateResult.resource.id,
        company_id: channelCreateResult.resource.company_id,
        workspace_id: ChannelVisibility.DIRECT,
      });
      expect(createdChannel).toBeDefined();

      const directChannelEntity = await channelService.channels.getDirectChannel({
        channel_id: createdChannel.id,
        company_id: createdChannel.company_id,
        users: DirectChannel.getUsersAsString(members),
      });
      expect(directChannelEntity).toBeDefined();

      const directChannelsInCompany = await channelService.channels.getDirectChannelInCompany(
        createdChannel.company_id,
        members,
      );
      expect(directChannelsInCompany).toBeDefined();

      done();
    });

    it("should not be able to create the same direct channel twice (with same users)", async done => {
      function createChannel(members: string[]) {
        return platform.app.inject({
          method: "POST",
          url: `${url}/companies/${platform.workspace.company_id}/workspaces/direct/channels`,
          headers: {
            authorization: `Bearer ${jwtToken}`,
          },
          payload: {
            options: {
              members,
            },
            resource: {
              name: "Hello",
              visibility: "direct",
            },
          },
        });
      }

      const jwtToken = await platform.auth.getJWTToken();
      const members = [uuidv4(), platform.currentUser.id];
      const ids = new Set<string>();

      let response = await createChannel(members);
      expect(response.statusCode).toEqual(201);
      let channelCreateResult: ChannelGetResponse<Channel> = deserialize(
        ChannelCreateResponse,
        response.body,
      );
      ids.add(channelCreateResult.resource.id);

      response = await createChannel(members);
      expect(response.statusCode).toEqual(201);
      channelCreateResult = deserialize(ChannelCreateResponse, response.body);
      ids.add(channelCreateResult.resource.id);

      expect(ids.size).toEqual(1);

      done();
    });

    it("should not be able to create the same direct channel twice (with same users not in the same order)", async done => {
      function createChannel(members: string[]) {
        return platform.app.inject({
          method: "POST",
          url: `${url}/companies/${platform.workspace.company_id}/workspaces/direct/channels`,
          headers: {
            authorization: `Bearer ${jwtToken}`,
          },
          payload: {
            options: {
              members,
            },
            resource: {
              name: "Hello",
              visibility: "direct",
            },
          },
        });
      }

      const jwtToken = await platform.auth.getJWTToken();
      const members = [uuidv4(), platform.currentUser.id];
      const ids = new Set<string>();

      let response = await createChannel(members);
      expect(response.statusCode).toEqual(201);
      let channelCreateResult: ChannelGetResponse<Channel> = deserialize(
        ChannelCreateResponse,
        response.body,
      );
      ids.add(channelCreateResult.resource.id);

      response = await createChannel(members.reverse());
      expect(response.statusCode).toEqual(201);
      channelCreateResult = deserialize(ChannelCreateResponse, response.body);
      ids.add(channelCreateResult.resource.id);

      expect(ids.size).toEqual(1);

      done();
    });
  });
});
