import { CoreUtil } from '../utils/core.util';
import { Layer } from './Layer';

export class LayerGroup extends Layer {
  _layers: any;
  constructor(options) {
    super(options);
  }
  addLayer(layer) {
    const id = this.getLayerId(layer);

    this._layers[id] = layer;

    if (this._map) {
      this._map.addLayer(layer);
    }

    return this;
  }

  // @method removeLayer(layer: Layer): this
  // Removes the given layer from the group.
  // @alternative
  // @method removeLayer(id: Number): this
  // Removes the layer with the given internal ID from the group.
  removeLayer(layer) {
    const id = layer in this._layers ? layer : this.getLayerId(layer);

    if (this._map && this._layers[id]) {
      this._map.removeLayer(this._layers[id]);
    }

    delete this._layers[id];

    return this;
  }

  // @method hasLayer(layer: Layer): Boolean
  // Returns `true` if the given layer is currently added to the group.
  // @alternative
  // @method hasLayer(id: Number): Boolean
  // Returns `true` if the given internal ID is currently added to the group.
  hasLayer(layer) {
    const layerId = typeof layer === 'number' ? layer : this.getLayerId(layer);
    return layerId in this._layers;
  }

  // @method clearLayers(): this
  // Removes all the layers from the group.
  clearLayers() {
    return this.eachLayer(this.removeLayer, this);
  }

  // @method invoke(methodName: String, …): this
  // Calls `methodName` on every layer contained in this group, passing any
  // additional parameters. Has no effect if the layers contained do not
  // implement `methodName`.
  invoke(methodName, ...args: any[]) {
    const _args = Array.prototype.slice.call(args, 1);
    let i, layer;

    for (i in this._layers) {
      layer = this._layers[i];

      if (layer[methodName]) {
        // eslint-disable-next-line prefer-spread
        layer[methodName].apply(layer, _args);
      }
    }

    return this;
  }

  onAdd(map) {
    this.eachLayer(map.addLayer, map);
    return this;
  }

  onRemove(map) {
    this.eachLayer(map.removeLayer, map);
  }

  // @method eachLayer(fn, context?: Object): this
  // Iterates over the layers of the group, optionally specifying context of the iterator function.
  // ```js
  // group.eachLayer(function (layer) {
  // 	layer.bindPopup('Hello');
  // });
  // ```
  eachLayer(method, context) {
    for (const i in this._layers) {
      method.call(context, this._layers[i]);
    }
    return this;
  }

  // @method getLayer(id: Number): Layer
  // Returns the layer with the given internal ID.
  getLayer(id) {
    return this._layers[id];
  }

  // @method getLayers(): Layer[]
  // Returns an array of all the layers added to the group.
  getLayers() {
    const layers = [];
    this.eachLayer(layers.push, layers);
    return layers;
  }

  // @method setZIndex(zIndex: Number): this
  // Calls `setZIndex` on every layer contained in this group, passing the z-index.
  setZIndex(zIndex) {
    return this.invoke('setZIndex', zIndex);
  }

  // @method getLayerId(layer: Layer): Number
  // Returns the internal ID for a layer
  getLayerId(layer) {
    return CoreUtil.stamp(layer);
  }
}
