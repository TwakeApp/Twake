import Collection, { GeneralOptions } from '../Collection';
import Resource from '../Resource';
import Storage, { MongoItemType } from '../Storage';

/**
 * Autocomplete local collection repository with backend components
 */
export default class FindCompletion<G extends Resource<any>> {
  private didLoadOnce: boolean = false;
  private nextPageToken: null | string = null;
  private hasMore: boolean = true;
  private perPage: number = 0;

  constructor(readonly collection: Collection<G>) {}

  /**
   * Take a list of mongoItems and complete (if needed) with new backend items
   * @param mongoItems
   * @param filter
   * @param options
   */
  public async completeFind(
    mongoItems: MongoItemType[],
    filter?: any,
    options?: GeneralOptions,
  ): Promise<MongoItemType[]> {
    options = options || {};
    options.httpOptions = {
      ...options.httpOptions,
    };
    if (options.limit) options.httpOptions.limit = options.limit || 100;
    if (options.page_token) options.httpOptions.page_token = options.page_token;
    if (options.search_query) options.httpOptions.search_query = options.search_query;

    //Not taking cache replacement into account if network
    if (!this.didLoadOnce || (this.hasMore && options.limit > mongoItems.length)) {
      this.perPage = this.perPage || options.limit;
      options.httpOptions.limit = this.perPage;
      if (this.nextPageToken) {
        options.httpOptions.page_token = this.nextPageToken;
      }

      const items = await this.collection.getTransport().get(filter, options?.httpOptions);

      if (!this.nextPageToken) {
        Storage.clear(this.collection.getPath());
        mongoItems = [];
      }

      if (items?.resources && items?.resources?.length) {
        const type = this.collection.getType();
        const list = items?.resources as any[];
        for (let i = 0; i < list.length; i++) {
          const resource = new type(list[i]);
          resource.setShared(true);
          const mongoItem = await Storage.upsert(
            this.collection.getPath(),
            resource.getDataForStorage(),
          );
          mongoItems.push(mongoItem);
        }
      }

      if (this.nextPageToken == items?.next_page_token || !items?.next_page_token) {
        this.hasMore = false;
      }
      this.nextPageToken = items?.next_page_token;
      this.didLoadOnce = true;
    }

    return mongoItems;
  }

  /**
   * Get an item from backend if not found in frontend
   * @param filter
   * @param options
   */
  public async completeFindOne(
    filter?: any,
    options?: GeneralOptions,
  ): Promise<MongoItemType | null> {
    options = options || {};
    options.httpOptions = {
      ...options.httpOptions,
    };
    if (options.limit) options.httpOptions.limit = options.limit || 100;
    if (options.page_token) options.httpOptions.page_token = options.page_token;
    if (options.search_query) options.httpOptions.search_query = options.search_query;

    filter = filter || {};
    filter.id = filter.id || 'no-id';

    let mongoItem: MongoItemType | null = null;
    const item = await this.collection.getTransport().get(filter, options?.httpOptions);
    if (item?.resource) {
      const type = this.collection.getType();
      const data = item?.resource;
      const resource = new type(data);
      resource.setShared(true);
      mongoItem = await Storage.upsert(this.collection.getPath(), resource.getDataForStorage());
    }

    return mongoItem;
  }
}
