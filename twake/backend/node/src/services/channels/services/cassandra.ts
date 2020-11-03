import cassandra from "cassandra-driver";
import { Channel } from "../entities";
import ChannelServiceAPI, { ChannelPrimaryKey } from "../provider";
import { CassandraPagination } from "../../../core/platform/services/database/services/connectors/cassandra";
import {
  CreateResult,
  DeleteResult,
  ListResult,
  OperationType,
  Pagination,
  SaveResult,
  UpdateResult,
} from "../../../core/platform/framework/api/crud-service";
import { WorkspaceExecutionContext } from "../types";
import { plainToClass } from "class-transformer";
import { pick } from "../../../utils/pick";

const UPDATE_KEYS = ["name", "company_id", "workspace_id", "id"] as const;
const UPDATABLE_KEYS = ["name"] as const;

export class CassandraChannelService implements ChannelServiceAPI {
  version = "1";
  table = "channels";

  constructor(private client: cassandra.Client) {}

  async save(channel: Channel, context: WorkspaceExecutionContext): Promise<SaveResult<Channel>> {
    const mode = channel.id ? OperationType.UPDATE : OperationType.CREATE;
    let resultChannel: Channel;

    if (mode === OperationType.CREATE) {
      resultChannel = (await this.create(channel, context)).entity;
    } else if (mode === OperationType.UPDATE) {
      resultChannel = (
        await this.update(
          {
            id: channel.id,
            company_id: channel.company_id,
            workspace_id: channel.workspace_id,
          },
          channel,
        )
      ).entity;
    }

    return new SaveResult<Channel>("channel", resultChannel, mode);
  }

  async update(pk: ChannelPrimaryKey, channel: Channel): Promise<UpdateResult<Channel>> {
    const channelToUpdate = await this.get(pk);

    if (!channelToUpdate) {
      throw new Error("Can not find the channel to update");
    }

    const updatableChannel = pick(channel, ...UPDATABLE_KEYS);
    const fullChannelUpdate = { ...channelToUpdate, ...updatableChannel };
    const columnList = UPDATE_KEYS.map(key => `"${key}"`).join(",");
    const columnValues = "?".repeat(UPDATE_KEYS.length).split("").join(",");
    const query = `INSERT INTO ${this.table} (${columnList}) VALUES (${columnValues})`;

    await this.client.execute(query, pick(fullChannelUpdate, ...UPDATE_KEYS));

    return new UpdateResult<Channel>("channel", fullChannelUpdate);
  }

  async create(
    channel: Channel,
    context: WorkspaceExecutionContext,
  ): Promise<CreateResult<Channel>> {
    channel.id = String(cassandra.types.Uuid.random());
    channel.workspace_id = context.workspace.workspace_id;
    channel.company_id = context.workspace.company_id;
    channel.owner = context.user.id;

    const query = `INSERT INTO ${this.table}
      (
      "company_id",
      "workspace_id",
      "id",
      "owner",
      "icon",
      "name",
      "description",
      "channel_group",
      "visibility",
      "is_default",
      "archived"
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`;

    await this.client.execute(query, channel, { prepare: false });

    return new CreateResult<Channel>("channel", channel);
  }

  async get(key: ChannelPrimaryKey): Promise<Channel> {
    const query = `SELECT * FROM ${this.table} WHERE id = ? AND company_id = ? AND workspace_id = ?`;
    const row = (await this.client.execute(query, key)).first();

    if (!row) {
      return;
    }

    return this.mapRowToChannel(row);
  }

  async delete(key: ChannelPrimaryKey): Promise<DeleteResult<Channel>> {
    const query = `DELETE FROM ${this.table} WHERE id = ? AND company_id = ? AND workspace_id = ?`;
    await this.client.execute(query, key);

    return new DeleteResult<Channel>("channel", key as Channel, true);
  }

  async list(
    pagination: Pagination,
    context: WorkspaceExecutionContext,
  ): Promise<ListResult<Channel>> {
    const paginate = CassandraPagination.from(pagination);
    const query = `SELECT * FROM ${this.table} WHERE company_id = ? AND workspace_id = ?`;
    const result = await this.client.execute(query, context.workspace, {
      fetchSize: paginate.limit,
      pageState: paginate.page_token,
    });

    if (!result.rowLength) {
      return new ListResult<Channel>("channel", []);
    }

    result.nextPage;

    return new ListResult<Channel>(
      "channel",
      result.rows.map(row => this.mapRowToChannel(row)),
      CassandraPagination.next(paginate, result.pageState),
    );
  }

  mapRowToChannel(row: cassandra.types.Row): Channel {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel: { [column: string]: any } = {};

    (row.keys() || []).forEach(key => (channel[key] = row.get(key)));

    return plainToClass(Channel, channel);
  }
}
