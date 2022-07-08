import { Layer, LayerOptions } from '../Layer';
import { Renderer } from './Renderer';

export interface InteractiveLayerOptions extends LayerOptions {
  interactive?: boolean | undefined;
  bubblingMouseEvents?: boolean | undefined;
}

export type LineCapShape = 'butt' | 'round' | 'square' | 'inherit';

export type LineJoinShape = 'miter' | 'round' | 'bevel' | 'inherit';

export type FillRule = 'nonzero' | 'evenodd' | 'inherit';

export interface PathOptions extends InteractiveLayerOptions, LayerOptions {
  stroke?: boolean | undefined;
  color?: string | undefined;
  weight?: number | undefined;
  opacity?: number | undefined;
  lineCap?: LineCapShape | undefined;
  lineJoin?: LineJoinShape | undefined;
  dashArray?: string | number[] | undefined;
  dashOffset?: string | undefined;
  fill?: boolean | undefined;
  fillColor?: string | undefined;
  fillOpacity?: number | undefined;
  fillRule?: FillRule | undefined;
  renderer?: Renderer | undefined;
  className?: string | undefined;
}

export abstract class Path extends Layer {
  stroke = true;
  color = '#3388ff';
  weight = 3;
  opacity = 1;
  lineCap = 'round';
  lineJoin = 'round';
  dashArray = null;
  dashOffset = null;
  fill = false;
  fillColor = null;
  fillOpacity = 0.2;
  fillRule = 'evenodd';
  interactive = true;
  bubblingMouseEvents = true;
  renderer?: Renderer | undefined;
  className?: string | undefined;
  protected _path: HTMLElement;
  constructor(options: PathOptions) {
    super(options);
  }

  beforeAdd(map) {
    // Renderer is set here because we need to call renderer.getEvents
    // before this.getEvents.
    this.renderer = map.getRenderer(this);
  }

  onAdd() {
    this.renderer._initPath(this);
    this._reset();
    this.renderer._addPath(this);
  }

  onRemove() {
    this.renderer._removePath(this);
  }

  // @method redraw(): this
  // Redraws the layer. Sometimes useful after you changed the coordinates that the path uses.
  redraw() {
    if (this._map) {
      this.renderer._updatePath(this);
    }
    return this;
  }

  // @method setStyle(style: Path options): this
  // Changes the appearance of a Path based on the options in the `Path options` object.
  setStyle(style) {
    if (this.renderer) {
      this.renderer._updateStyle(this);
      return this;
    }
  }

  // @method bringToFront(): this
  // Brings the layer to the top of all path layers.
  bringToFront() {
    if (this.renderer) {
      this.renderer._bringToFront(this);
    }
    return this;
  }

  // @method bringToBack(): this
  // Brings the layer to the bottom of all path layers.
  bringToBack() {
    if (this.renderer) {
      this.renderer._bringToBack(this);
    }
    return this;
  }

  getElement() {
    return this._path;
  }

  abstract _project();
  abstract _update();

  _reset() {
    // defined in child classes
    this._project();
    this._update();
  }

  _clickTolerance() {
    // used when doing hit detection for Canvas layers
    return (this.stroke ? this.weight / 2 : 0) + (this.renderer.tolerance || 0);
  }
}
