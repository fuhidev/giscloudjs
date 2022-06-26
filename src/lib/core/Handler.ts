import { DMap } from '../map/Map';
import { Accessor } from './Accessor';

export abstract class Handler extends Accessor {
  private map: DMap;
  private _enabled = false;
  constructor(map: DMap) {
    super();
    this.map = map;
  }

  abstract addHooks(): void;
  abstract removeHooks(): void;

  enable() {
    if (this._enabled) {
      return this;
    }
    this._enabled = true;
    this.addHooks();
    return this;
  }

  disable() {
    if (!this._enabled) {
      return this;
    }

    this._enabled = false;
    this.removeHooks();
    return this;
  }

  // @method enabled(): Boolean
  // Returns `true` if the handler is enabled
  enabled() {
    return !!this._enabled;
  }

  static addTo(map: DMap, name: string) {
    map.addHandler(name, this);
    return this;
  }
}
