import Observable from 'app/services/Observable/Observable';
import _ from 'lodash';

export type ViewTypes =
  | 'channel'
  | 'channel_thread'
  | 'channel_pinned'
  | 'channel_files'
  | 'application'
  | '';

export type ViewConfiguration = {
  app?: { [key: string]: any }; //In depreciated app is used
  collection?: any;
  context:
    | {
        tabId?: string;
        configuration?: object;
      }
    | any
    | null;
  hasTabs?: boolean;
};

const defaultConfiguration: ViewConfiguration = {
  app: { simple_name: 'messages' },
  collection: null,
  context: null,
  hasTabs: false,
};

export default class AppViewService extends Observable {
  private id: string = '';
  private configuration: ViewConfiguration = defaultConfiguration;

  public getViewType(): ViewTypes {
    return '';
  }

  public getId() {
    return this.id;
  }

  public getConfiguration() {
    return this.configuration;
  }

  public select(id: string, configuration?: ViewConfiguration) {
    this.id = id;
    this.configuration = _.assign(_.clone(defaultConfiguration), configuration);
    this.notify();
  }
}
