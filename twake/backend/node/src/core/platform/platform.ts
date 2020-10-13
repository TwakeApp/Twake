import { TwakeContainer, TwakeServiceProvider, TwakeComponent } from "./framework";
import * as ComponentUtils from "./framework/utils/component-utils";

export class TwakePlatform extends TwakeContainer {

  constructor(protected options: TwakePlatformConfiguration) {
    super();
  }

  api(): TwakeServiceProvider {
    return null;
  }

  async loadComponents(): Promise<Map<string, TwakeComponent>> {
    return await ComponentUtils.loadComponents(this.options.servicesPath, this.options.services, {
      getProvider: this.getProvider.bind(this)
    });
  }
}

export class TwakePlatformConfiguration {
  /**
   * The services to load in the container
   */
  services: string[];

  /**
   * The path to load services from
   */
  servicesPath: string;
}
