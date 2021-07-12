import { Type } from "class-transformer";
import { merge } from "lodash";
import { Column, Entity } from "../../../core/platform/services/database/services/orm/decorators";
import { Block } from "../blocks-types";

export const TYPE = "messages";
@Entity(TYPE, {
  primaryKey: [["thread_id"], "id"],
  type: TYPE,
  search: {
    index: "messages",
    mongoMapping: {
      text: {
        text: "text",
      },
    },
    esMapping: {
      properties: {
        text: { type: "text" },
      },
    },
    source: (entity: Message) => {
      return {
        text: entity.text,
      };
    },
  },
})
export class Message {
  @Type(() => String)
  @Column("thread_id", "timeuuid", { order: "DESC" })
  thread_id: string;

  @Type(() => String)
  @Column("id", "timeuuid", { generator: "timeuuid", order: "DESC" })
  id: string;

  @Type(() => String) //Not in database (obviousl y because it is ephemeral)
  ephemeral: EphemeralMessage | null; //Used for non-persisted messages (like interractive messages)

  @Type(() => String)
  @Column("type", "encoded_string")
  type:
    | "message" // Classic message
    | "event"; // Hidden system events

  @Column("subtype", "encoded_string")
  subtype:
    | null
    | "application" //Message from a connector
    | "deleted" //Message deleted by user
    | "system"; // Message from system (channel activity)

  @Type(() => Number)
  @Column("created_at", "number")
  created_at: number;

  @Column("updated_at", "number", { onUpsert: _ => new Date().getTime() })
  updated_at: number;

  @Type(() => String)
  @Column("user_id", "uuid")
  user_id: string;

  @Column("application_id", "encoded_string")
  application_id: null | string;

  @Type(() => String)
  @Column("text", "encoded_string")
  text: string;

  @Column("blocks", "encoded_json")
  blocks: Block[];

  @Column("files", "encoded_json")
  files: null | string[];

  @Column("context", "encoded_json")
  context: any;

  @Column("edited", "encoded_json")
  edited: null | MessageEdited;

  @Column("pinned_info", "encoded_json")
  pinned_info: null | MessagePinnedInfo;

  @Column("reactions", "encoded_json")
  reactions: null | MessageReaction[];

  @Column("bookmarks", "encoded_json")
  bookmarks: null | MessageBookmarks[];

  @Column("override", "encoded_json")
  override: null | MessageOverride;
}

export type MessageReaction = { count: number; name: string; users: string[] };

export type MessageOverride = { title?: string; picture?: string };

export type MessagePinnedInfo = { pinned_at: number; pinned_by: string };

export type MessageEdited = { edited_at: number };

export type EphemeralMessage = {
  id: string; //Identifier of the ephemeral message
  version: string; //Version of ephemeral message (to update the view)
  recipient: string; //User that will see this ephemeral message
  recipient_context_id: string; //Recipient current view/tab/window to send the message to
};

export type MessageBookmarks = {
  user_id: string;
  bookmark_id: string;
  created_at: number;
};

export type MessagePrimaryKey = Pick<Message, "thread_id" | "id">;

export function getInstance(message: Partial<Message>): Message {
  return merge(new Message(), {
    id: undefined,
    ephemeral: null,
    type: "message",
    created_at: new Date().getTime(),
    application_id: null,
    text: "",
    blocks: [],

    ...message,
  });
}
