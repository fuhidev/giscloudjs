import { CoreUtil } from '../utils/core.util';
import { StringUtil } from '../utils/string.util';

export interface IEvent {
  fn: (e: any) => any;
  ctx: any;
  once: boolean;
}

export class Evented {
  private events = new Map<string, IEvent[]>();
  private _firingCount = 0;
  private eventParents = new Map<string, Evented>();
  on(types, fn, context?) {
    if (typeof types === 'object') {
      for (const type in types) {
        // we don't process space-separated events here for performance;
        // it's a hot path since Layer uses the on(obj) syntax
        this.onOneType(type, types[type], fn);
      }
    } else {
      // types can be a string of space-separated words
      types = StringUtil.splitWords(types);

      for (let i = 0, len = types.length; i < len; i++) {
        this.onOneType(types[i], fn, context);
      }
    }

    return this;
  }
  private onOneType(type, fn, context, _once?: boolean) {
    if (typeof fn !== 'function') {
      console.warn('wrong listener type: ' + typeof fn);
      return;
    }

    // check if fn already there
    if (this._listens(type, fn, context) !== false) {
      return;
    }

    if (context === this) {
      // Less memory footprint.
      context = undefined;
    }

    const newListener = { fn: fn, ctx: context, once: false };
    if (_once) {
      newListener.once = true;
    }

    {
      const values = this.events.get(type) || [];
      values.push(newListener);
      this.events.set(type, values);
    }
  }
  off(types, fn, context?) {
    if (!arguments.length) {
      // clear all listeners if called without arguments
      this.events.clear();
    } else if (typeof types === 'object') {
      for (const type in types) {
        this.offOneType(type, types[type], fn);
      }
    } else {
      types = StringUtil.splitWords(types);

      const removeAll = arguments.length === 1;
      for (let i = 0, len = types.length; i < len; i++) {
        if (removeAll) {
          this.offOneType(types[i]);
        } else {
          this.offOneType(types[i], fn, context);
        }
      }
    }
    return this;
  }
  private offOneType(type, fn?, context?) {
    let listeners: IEvent[], i, len;

    listeners = this.events.get(type);
    if (!listeners) {
      return;
    }

    if (arguments.length === 1) {
      // remove all
      if (this._firingCount) {
        // Set all removed listeners to noop
        // so they are not called if remove happens in fire
        for (i = 0, len = listeners.length; i < len; i++) {
          listeners[i].fn = this.falseFn;
        }
      }
      // clear all listeners for a type if function isn't specified
      this.events.delete(type);
      return;
    }

    if (typeof fn !== 'function') {
      console.warn('wrong listener type: ' + typeof fn);
      return;
    }

    // find fn and remove it
    const index = this._listens(type, fn, context);
    if (index !== false && typeof index === 'number') {
      const listener = listeners[index];
      if (this._firingCount) {
        // set the removed listener to noop so that's not called if remove happens in fire
        listener.fn = this.falseFn;

        /* copy array in case events are being fired */
        listeners = listeners.slice();
        this.events.set(type, listeners);
      }
      listeners.splice(index, 1);
    }
  }

  fire(type: string, data?, propagate?) {
    if (!this.listens(type, propagate)) {
      return this;
    }

    const event = {
      ...data,
      type: type,
      target: this,
      sourceTarget: (data && data.sourceTarget) || this,
    };

    const listeners = this.events.get(type);
    if (listeners) {
      this._firingCount = this._firingCount + 1 || 1;
      for (let i = 0, len = listeners.length; i < len; i++) {
        const l = listeners[i];
        // off overwrites l.fn, so we need to copy fn to a var
        const fn = l.fn;
        if (l.once) {
          this.off(type, fn, l.ctx);
        }
        fn.call(l.ctx || this, event);
      }

      this._firingCount--;
    }

    if (propagate) {
      // propagate the event to parents (set with addEventParent)
      this._propagateEvent(event);
    }

    return this;
  }

  // @method listens(type: String, propagate?: Boolean): Boolean
  // @method listens(type: String, fn: Function, context?: Object, propagate?: Boolean): Boolean
  // Returns `true` if a particular event type has any listeners attached to it.
  // The verification can optionally be propagated, it will return `true` if parents have the listener attached to it.
  listens(type, fn, context?, propagate?) {
    if (typeof type !== 'string') {
      console.warn('"string" type argument expected');
    }

    if (typeof fn !== 'function') {
      propagate = !!fn;
      fn = undefined;
      context = undefined;
    }

    const listeners = this.events.get(type);
    if (listeners && listeners.length) {
      if (this._listens(type, fn, context) !== false) {
        return true;
      }
    }

    if (propagate) {
      // also check parents for listeners if event propagates
      for (const value of this.eventParents.values()) {
        if (value.listens(type, fn, context, propagate)) {
          return true;
        }
      }
    }
    return false;
  }

  // returns the index (number) or false
  private _listens(type, fn, context) {
    const listeners = this.events.get(type) || [];
    if (!fn) {
      return !!listeners.length;
    }

    if (context === this) {
      // Less memory footprint.
      context = undefined;
    }

    for (let i = 0, len = listeners.length; i < len; i++) {
      if (listeners[i].fn === fn && listeners[i].ctx === context) {
        return i;
      }
    }
    return false;
  }

  once(types, fn, context) {
    if (typeof types === 'object') {
      for (const type in types) {
        // we don't process space-separated events here for performance;
        // it's a hot path since Layer uses the on(obj) syntax
        this.onOneType(type, types[type], fn, true);
      }
    } else {
      // types can be a string of space-separated words
      types = StringUtil.splitWords(types);

      for (let i = 0, len = types.length; i < len; i++) {
        this.onOneType(types[i], fn, context, true);
      }
    }

    return this;
  }

  // @method addEventParent(obj: Evented): this
  // Adds an event parent - an `Evented` that will receive propagated events
  addEventParent(obj) {
    this.eventParents.set(CoreUtil.stamp(obj), obj);
    return this;
  }

  // @method removeEventParent(obj: Evented): this
  // Removes an event parent, so it will stop receiving propagated events
  removeEventParent(obj) {
    if (this.eventParents) {
      this.eventParents.delete(CoreUtil.stamp(obj));
    }
    return this;
  }

  private _propagateEvent(e) {
    this.eventParents.forEach((value) => {
      value.fire(
        e.type,
        {
          layer: e.target,
          propagatedFrom: e.target,
          ...e,
        },
        true
      );
    });
  }

  private falseFn() {
    return false;
  }
}
