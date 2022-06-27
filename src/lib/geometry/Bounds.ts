import { Accessor } from '../core/Accessor';
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

export class Bounds extends Accessor {
  // @property min: Point
  // The top left corner of the rectangle.
  topLeft: Point;
  // @property max: Point
  bottomRight: Point;
  // The bottom right corner of the rectangle.
  constructor(options: BoundsOptions) {
    super(options);
  }

  // @method extend(point: Point): this
  // Extends the bounds to contain the given point.

  // @alternative
  // @method extend(otherBounds: Bounds): this
  // Extend the bounds to contain the given bounds
  extend(min: Point, max?: Point) {
    if (!this.topLeft && !this.bottomRight) {
      this.topLeft = min.clone();
      this.bottomRight = max.clone();
    } else {
      this.topLeft.x = Math.min(min.x, this.topLeft.x);
      this.bottomRight.x = Math.max(max.x, this.bottomRight.x);
      this.topLeft.y = Math.min(min.y, this.topLeft.y);
      this.bottomRight.y = Math.max(max.y, this.bottomRight.y);
    }
    return this;
  }

  // @method getCenter(round?: Boolean): Point
  // Returns the center point of the bounds.
  getCenter() {
    return new Point({
      x: (this.topLeft.x + this.bottomRight.x) / 2,
      y: (this.topLeft.y + this.bottomRight.y) / 2,
    });
  }

  // @method getBottomLeft(): Point
  // Returns the bottom-left point of the bounds.
  getBottomLeft() {
    return new Point({ x: this.topLeft.x, y: this.bottomRight.y });
  }

  // @method getTopRight(): Point
  // Returns the top-right point of the bounds.
  getTopRight() {
    // -> Point
    return new Point({ x: this.bottomRight.x, y: this.topLeft.y });
  }

  // @method getTopLeft(): Point
  // Returns the top-left point of the bounds (i.e. [`this.min`](#bounds-min)).
  getTopLeft() {
    return this.topLeft; // left, top
  }

  // @method getBottomRight(): Point
  // Returns the bottom-right point of the bounds (i.e. [`this.max`](#bounds-max)).
  getBottomRight() {
    return this.bottomRight; // right, bottom
  }

  // @method getSize(): Point
  // Returns the size of the given bounds
  getSize() {
    return this.bottomRight.subtract(this.topLeft);
  }

  // @method contains(otherBounds: Bounds): Boolean
  // Returns `true` if the rectangle contains the given one.
  // @alternative
  // @method contains(point: Point): Boolean
  // Returns `true` if the rectangle contains the given point.
  contains(target: Point | Bounds) {
    let min: Point, max: Point;

    if (target instanceof Bounds) {
      min = target.topLeft;
      max = target.bottomRight;
    } else {
      min = max = target;
    }

    return (
      min.x >= this.topLeft.x &&
      max.x <= this.bottomRight.x &&
      min.y >= this.topLeft.y &&
      max.y <= this.bottomRight.y
    );
  }

  // @method intersects(otherBounds: Bounds): Boolean
  // Returns `true` if the rectangle intersects the given bounds. Two bounds
  // intersect if they have at least one point in common.
  intersects(bounds: Bounds) {
    const min = this.topLeft,
      max = this.bottomRight,
      min2 = bounds.topLeft,
      max2 = bounds.bottomRight,
      xIntersects = max2.x >= min.x && min2.x <= max.x,
      yIntersects = max2.y >= min.y && min2.y <= max.y;

    return xIntersects && yIntersects;
  }

  // @method overlaps(otherBounds: Bounds): Boolean
  // Returns `true` if the rectangle overlaps the given bounds. Two bounds
  // overlap if their intersection is an area.
  overlaps(bounds: Bounds) {
    const min = this.topLeft,
      max = this.bottomRight,
      min2 = bounds.topLeft,
      max2 = bounds.bottomRight,
      xOverlaps = max2.x > min.x && min2.x < max.x,
      yOverlaps = max2.y > min.y && min2.y < max.y;

    return xOverlaps && yOverlaps;
  }

  // @method isValid(): Boolean
  // Returns `true` if the bounds are properly initialized.
  isValid() {
    return !!(this.topLeft && this.bottomRight);
  }

  // @method pad(bufferRatio: Number): Bounds
  // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
  // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
  // Negative values will retract the bounds.
  pad(bufferRatio: number) {
    const min = this.topLeft,
      max = this.bottomRight,
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
      this.topLeft.equals(bounds.getTopLeft()) &&
      this.bottomRight.equals(bounds.getBottomRight())
    );
  }
}
