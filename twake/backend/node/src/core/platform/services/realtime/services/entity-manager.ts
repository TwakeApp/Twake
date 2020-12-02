import { logger } from "../../../framework/logger";
import { RealtimeEntityActionType, RealtimeEntityEvent } from "../types";
import WebSocketAPI from "../../../services/websocket/provider";
import { eventBus } from "../bus";

const REALTIME_RESOURCE = "realtime:resource";

export default class RealtimeEntityManager {
  constructor(private ws: WebSocketAPI) {}

  init(): void {
    eventBus.subscribe(RealtimeEntityActionType.Created, event => {
      this.pushResourceEvent(event, RealtimeEntityActionType.Created);
    });

    eventBus.subscribe(RealtimeEntityActionType.Updated, event => {
      this.pushResourceEvent(event, RealtimeEntityActionType.Updated);
    });

    eventBus.subscribe(RealtimeEntityActionType.Deleted, event => {
      this.pushResourceEvent(event, RealtimeEntityActionType.Deleted);
    });

    eventBus.subscribe(RealtimeEntityActionType.Saved, event => {
      this.pushResourceEvent(event, RealtimeEntityActionType.Saved);
    });
  }

  private pushResourceEvent(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: RealtimeEntityEvent<any>,
    action: RealtimeEntityActionType,
  ): void {
    event.room.path.forEach(path => {
      logger.info(`Pushing ${action} entity to room ${path}`);

      this.ws.getIo().to(path).emit(REALTIME_RESOURCE, {
        action,
        room: path,
        type: event.type,
        path: event.resourcePath,
        resource: event.entity,
      });
    });
  }
}
