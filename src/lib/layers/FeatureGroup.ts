import { LatLngBounds } from '../geometry';
import { LayerGroup } from './LayerGroup';

export class FeatureGroup extends LayerGroup {
  addLayer(layer) {
    if (this.hasLayer(layer)) {
      return this;
    }

    layer.addEventParent(this);
    super.addLayer(layer);

    // @event layeradd: LayerEvent
    // Fired when a layer is added to this `FeatureGroup`
    return this.fire('layeradd', { layer: layer });
  }

  removeLayer(layer) {
    if (!this.hasLayer(layer)) {
      return this;
    }
    if (layer in this._layers) {
      layer = this._layers[layer];
    }

    layer.removeEventParent(this);

    LayerGroup.prototype.removeLayer.call(this, layer);

    // @event layerremove: LayerEvent
    // Fired when a layer is removed from this `FeatureGroup`
    return this.fire('layerremove', { layer: layer });
  }

  // @method setStyle(style: Path options): this
  // Sets the given path options to each layer of the group that has a `setStyle` method.
  setStyle(style) {
    return this.invoke('setStyle', style);
  }

  // @method bringToFront(): this
  // Brings the layer group to the top of all other layers
  bringToFront() {
    return this.invoke('bringToFront');
  }

  // @method bringToBack(): this
  // Brings the layer group to the back of all other layers
  bringToBack() {
    return this.invoke('bringToBack');
  }

  // @method getBounds(): LatLngBounds
  // Returns the LatLngBounds of the Feature Group (created from bounds and coordinates of its children).
  getBounds() {
    const bounds = new LatLngBounds();

    for (const id in this._layers) {
      const layer = this._layers[id];
      bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
    }
    return bounds;
  }
}
