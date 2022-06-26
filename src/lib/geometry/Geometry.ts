import { Accessor } from '../core/Accessor';

export abstract class Geometry extends Accessor {
  abstract clone(): Geometry;
}
