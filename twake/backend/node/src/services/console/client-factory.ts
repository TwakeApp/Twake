import { ConsoleRemoteClient } from "./clients/remote";
import { ConsoleServiceClient } from "./client-interface";
import { ConsoleOptions, ConsoleType } from "./types";
import { ConsoleInternalClient } from "./clients/internal";
import { ConsoleServiceAPI } from "./api";

class StaticConsoleClientFactory {
  create(consoleInstance: ConsoleServiceAPI): ConsoleServiceClient {
    const type: ConsoleType = consoleInstance.consoleType;
    switch (type) {
      case "remote":
        return new ConsoleRemoteClient(consoleInstance, false);
      case "internal":
        return new ConsoleInternalClient(consoleInstance);
      default:
        throw new Error(`${type} is not supported`);
    }
  }
}

export const ConsoleClientFactory = new StaticConsoleClientFactory();
