import { Point } from './Point';

/*
 * @class Bounds
 * @aka L.Bounds
 *
 * Represents a rectangular area in pixel coordinates.
 *
 * @example
 *
 * ```js
 * var p1 = L.point(10, 10),
 * p2 = L.point(40, 60),
 * bounds = L.bounds(p1, p2);
 * ```
 *
 * All Leaflet methods that accept `Bounds` objects also accept them in a simple Array form (unless noted otherwise), so the bounds example above can be passed like this:
 *
 * ```js
 * otherBounds.intersects([[10, 10], [40, 60]]);
 * ```
 *
 * Note that `Bounds` does not inherit from Leaflet's `Class` object,
 * which means new classes can't inherit from it, and new methods
 * can't be added to it with the `include` function.
 */

export interface BoundsOptions {
  topLeft: Point;
  bottomRight: Point;
}

export class Bounds {
  // @property min: Point
  // The top left corner of the rectangle.
  min: Point;
  // @property max: Point
  max: Point;
  // The bottom right corner of the rectangle.
  constructor(options: BoundsOptions) {
    this.min = options.topLeft;
    this.max = options.bottomRight;
  }

  // @method extend(point: Point): this
  // Extends the bounds to contain the given point.

  // @alternative
  // @method extend(otherBounds: Bounds): this
  // Extend the bounds to contain the given bounds
  extend(min: Point, max?: Point) {
    if (!this.min && !this.max) {
      this.min = min.clone();
      this.max = max.clone();
    } else {
      this.min.x = Math.min(min.x, this.min.x);
      this.max.x = Math.max(max.x, this.max.x);
      this.min.y = Math.min(min.y, this.min.y);
      this.max.y = Math.max(max.y, this.max.y);
    }
    return this;
  }

  // @method getCenter(round?: Boolean): Point
  // Returns the center point of the bounds.
  getCenter() {
    return new Point({
      x: (this.min.x + this.max.x) / 2,
      y: (this.min.y + this.max.y) / 2,
    });
  }

  // @method getBottomLeft(): Point
  // Returns the bottom-left point of the bounds.
  getBottomLeft() {
    return new Point({ x: this.min.x, y: this.max.y });
  }

  // @method getTopRight(): Point
  // Returns the top-right point of the bounds.
  getTopRight() {
    // -> Point
    return new Point({ x: this.max.x, y: this.min.y });
  }

  // @method getTopLeft(): Point
  // Returns the top-left point of the bounds (i.e. [`this.min`](#bounds-min)).
  getTopLeft() {
    return this.min; // left, top
  }

  // @method getBottomRight(): Point
  // Returns the bottom-right point of the bounds (i.e. [`this.max`](#bounds-max)).
  getBottomRight() {
    return this.max; // right, bottom
  }

  // @method getSize(): Point
  // Returns the size of the given bounds
  getSize() {
    return this.max.subtract(this.min);
  }

  // @method contains(otherBounds: Bounds): Boolean
  // Returns `true` if the rectangle contains the given one.
  // @alternative
  // @method contains(point: Point): Boolean
  // Returns `true` if the rectangle contains the given point.
  contains(target: Point | Bounds) {
    let min: Point, max: Point;

    if (target instanceof Bounds) {
      min = target.min;
      max = target.max;
    } else {
      min = max = target;
    }

    return (
      min.x >= this.min.x &&
      max.x <= this.max.x &&
      min.y >= this.min.y &&
      max.y <= this.max.y
    );
  }

  // @method intersects(otherBounds: Bounds): Boolean
  // Returns `true` if the rectangle intersects the given bounds. Two bounds
  // intersect if they have at least one point in common.
  intersects(bounds: Bounds) {
    const min = this.min,
      max = this.max,
      min2 = bounds.min,
      max2 = bounds.max,
      xIntersects = max2.x >= min.x && min2.x <= max.x,
      yIntersects = max2.y >= min.y && min2.y <= max.y;

    return xIntersects && yIntersects;
  }

  // @method overlaps(otherBounds: Bounds): Boolean
  // Returns `true` if the rectangle overlaps the given bounds. Two bounds
  // overlap if their intersection is an area.
  overlaps(bounds: Bounds) {
    const min = this.min,
      max = this.max,
      min2 = bounds.min,
      max2 = bounds.max,
      xOverlaps = max2.x > min.x && min2.x < max.x,
      yOverlaps = max2.y > min.y && min2.y < max.y;

    return xOverlaps && yOverlaps;
  }

  // @method isValid(): Boolean
  // Returns `true` if the bounds are properly initialized.
  isValid() {
    return !!(this.min && this.max);
  }

  // @method pad(bufferRatio: Number): Bounds
  // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
  // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
  // Negative values will retract the bounds.
  pad(bufferRatio: number) {
    const min = this.min,
      max = this.max,
      heightBuffer = Math.abs(min.x - max.x) * bufferRatio,
      widthBuffer = Math.abs(min.y - max.y) * bufferRatio;

    return new Bounds({
      topLeft: new Point({ x: min.x - heightBuffer, y: min.y - widthBuffer }),
      bottomRight: new Point({
        x: max.x + heightBuffer,
        y: max.y + widthBuffer,
      }),
    });
  }

  // @method equals(otherBounds: Bounds, maxMargin?: Number): Boolean
  // Returns `true` if the rectangle is equivalent (within a small margin of error) to the given bounds. The margin of error can be overridden by setting `maxMargin` to a small number.
  equals(bounds: Bounds) {
    if (!bounds) {
      return false;
    }

    return (
      this.min.equals(bounds.getTopLeft()) &&
      this.max.equals(bounds.getBottomRight())
    );
  }
}
