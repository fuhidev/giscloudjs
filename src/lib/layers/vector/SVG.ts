import { DomEvent } from '../../core/dom/domEvent/DomEvent';
import { DomUtil } from '../../core/dom/DomUtil';
import { SvgUtil } from '../../symbols/support/SVG.Util';
import { CoreUtil } from '../../utils/core.util';
import { Renderer } from './Renderer';

export class SVG extends Renderer {
  _rootGroup: any;
  _svgSize: any;
  _initContainer() {
    this._container = SvgUtil.svgCreate('svg');

    // makes it possible to click through svg root; we'll reset it back in individual paths
    this._container.setAttribute('pointer-events', 'none');

    this._rootGroup = SvgUtil.svgCreate('g');
    this._container.appendChild(this._rootGroup);
  }

  _destroyContainer() {
    DomUtil.remove(this._container);
    DomEvent.off(this._container);
    delete this._container;
    delete this._rootGroup;
    delete this._svgSize;
  }

  _update() {
    if (this._map._animatingZoom && this._bounds) {
      return;
    }

    Renderer.prototype._update.call(this);

    const b = this._bounds,
      size = b.getSize(),
      container = this._container;

    // set size of svg-container if changed
    if (!this._svgSize || !this._svgSize.equals(size)) {
      this._svgSize = size;
      container.setAttribute('width', size.x);
      container.setAttribute('height', size.y);
    }

    // movement: update container viewBox so that we don't have to change coordinates of individual layers
    DomUtil.setPosition(container, b.min);
    container.setAttribute(
      'viewBox',
      [b.min.x, b.min.y, size.x, size.y].join(' ')
    );

    this.fire('update');
  }

  // methods below are called by vector layers implementations

  _initPath(layer) {
    const path = (layer._path = SvgUtil.svgCreate('path'));

    // @namespace Path
    // @option className: String = null
    // Custom class name set on an element. Only for SVG renderer.
    if (layer.options.className) {
      DomUtil.addClass(path, layer.options.className);
    }

    if (layer.options.interactive) {
      DomUtil.addClass(path, 'leaflet-interactive');
    }

    this._updateStyle(layer);
    this._layers[CoreUtil.stamp(layer)] = layer;
  }

  _addPath(layer) {
    if (!this._rootGroup) {
      this._initContainer();
    }
    this._rootGroup.appendChild(layer._path);
    layer.addInteractiveTarget(layer._path);
  }

  _removePath(layer) {
    DomUtil.remove(layer._path);
    layer.removeInteractiveTarget(layer._path);
    delete this._layers[CoreUtil.stamp(layer)];
  }

  _updatePath(layer) {
    layer._project();
    layer._update();
  }

  _updateStyle(layer) {
    const path = layer._path,
      options = layer.options;

    if (!path) {
      return;
    }

    if (options.stroke) {
      path.setAttribute('stroke', options.color);
      path.setAttribute('stroke-opacity', options.opacity);
      path.setAttribute('stroke-width', options.weight);
      path.setAttribute('stroke-linecap', options.lineCap);
      path.setAttribute('stroke-linejoin', options.lineJoin);

      if (options.dashArray) {
        path.setAttribute('stroke-dasharray', options.dashArray);
      } else {
        path.removeAttribute('stroke-dasharray');
      }

      if (options.dashOffset) {
        path.setAttribute('stroke-dashoffset', options.dashOffset);
      } else {
        path.removeAttribute('stroke-dashoffset');
      }
    } else {
      path.setAttribute('stroke', 'none');
    }

    if (options.fill) {
      path.setAttribute('fill', options.fillColor || options.color);
      path.setAttribute('fill-opacity', options.fillOpacity);
      path.setAttribute('fill-rule', options.fillRule || 'evenodd');
    } else {
      path.setAttribute('fill', 'none');
    }
  }

  _updatePoly(layer, closed) {
    this._setPath(layer, SvgUtil.pointsToPath(layer._parts, closed));
  }

  _updateCircle(layer) {
    const p = layer._point,
      r = Math.max(Math.round(layer._radius), 1),
      r2 = Math.max(Math.round(layer._radiusY), 1) || r,
      arc = 'a' + r + ',' + r2 + ' 0 1,0 ';

    // drawing a circle with two half-arcs
    const d = layer._empty()
      ? 'M0 0'
      : 'M' +
        (p.x - r) +
        ',' +
        p.y +
        arc +
        r * 2 +
        ',0 ' +
        arc +
        -r * 2 +
        ',0 ';

    this._setPath(layer, d);
  }

  _setPath(layer, path) {
    layer._path.setAttribute('d', path);
  }

  // SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
  _bringToFront(layer) {
    DomUtil.toFront(layer._path);
  }

  _bringToBack(layer) {
    DomUtil.toBack(layer._path);
  }
}
