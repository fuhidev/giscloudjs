import { Layer, LayerOptions } from '../Layer';

export interface RendererOptions extends LayerOptions {
  padding?: number | undefined;
  tolerance?: number | undefined;
}

export class Renderer extends Layer {
  padding = 0.1;
  tolerance?: number;
  constructor(options?: RendererOptions) {
    super(options);
  }
}
