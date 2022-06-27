import { Evented } from './Evented';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AccessorOptions {}

export class Accessor extends Evented {
  constructor(options?: AccessorOptions) {
    super();
    if (options) {
      Object.keys(options).forEach((key) => {
        if (options[key] !== undefined) {
          this[key] = options[key];
        }
      });
    }
  }
}
