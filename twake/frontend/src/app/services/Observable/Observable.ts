import { useEffect, useMemo, useState } from 'react';
import EventListener from 'events';

/**
 * Observable service
 * Allow any service to be listened and component to be updated when this service notify.
 * As a service just extends this class and call this.notify() when update was made.
 * As a component just call ServiceName.useWatcher(()=>ServiceName.store.status) //Only changes to store.status will trigger a change.
 */

type Watcher = {
  callback: (transform: any) => void;
  observedScope: () => any;
  savedChanges: any;
  options?: {
    observedChanges: (changes: any) => any;
  } & any;
};

export default class Observable extends EventListener {
  protected watchers: Watcher[] = [];

  constructor() {
    super();
    this.addWatcher = this.addWatcher.bind(this);
    this.notify = this.notify.bind(this);
    this.removeWatcher = this.removeWatcher.bind(this);
    this.getChanges = this.getChanges.bind(this);
  }

  useWatcher<G>(observedScope: () => Promise<G>, options?: any): G | undefined {
    const [state, setState] = useState<G>();

    useMemo(async () => {
      const watcher = this.addWatcher(setState, observedScope, options);
      const changes = await this.getChanges<G>(watcher);
      setState(changes.changes);
    }, []);

    useEffect(() => {
      //Called on component unmount
      return () => {
        this.removeWatcher(setState);
      };
    }, []);

    return state;
  }

  notify() {
    this.watchers.forEach(async watcher => {
      const changes = await this.getChanges(watcher);
      if (changes.didChange) {
        //If things changed
        watcher.callback(
          //Could be imporved ?
          typeof changes.changes === 'object' && changes.changes?.constructor?.name != 'Array'
            ? Object.assign(Object.create(Object.getPrototypeOf(changes.changes)), changes.changes)
            : changes.changes,
        );
      }
    });
  }

  async getChanges<G>(watcher: Watcher): Promise<{ changes: G; didChange: boolean }> {
    const changes = await watcher.observedScope();

    let observed = changes;
    if (watcher.options?.observedChanges) {
      observed = watcher.options?.observedChanges(changes);
    }

    const snapshot = JSON.stringify(observed);
    if (watcher.savedChanges === snapshot) {
      return { changes: changes, didChange: false };
    }
    watcher.savedChanges = snapshot;

    return { changes: changes, didChange: true };
  }

  addWatcher(callback: (transform: any) => void, observedScope: () => any, options?: any): Watcher {
    const watcher = {
      callback: callback,
      observedScope: observedScope,
      savedChanges: null,
      options: options,
    };
    if (this.watchers.length === 0) {
      this.emit('watcher:exists');
    }
    this.watchers.push(watcher);
    return watcher;
  }

  removeWatcher(callback: (transform: any) => void) {
    const lengthBefore = this.watchers.length;
    this.watchers = this.watchers.filter(i => i.callback !== callback);
    if (lengthBefore > 0 && this.watchers.length === 0) {
      this.emit('watcher:none');
    }
  }
}
