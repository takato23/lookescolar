// SSR stub for postprocessing
// This replaces the postprocessing package on the server side

export class Effect {}
export class Pass {}
export class RenderPass extends Pass {}
export class NormalPass extends Pass {}
export class DepthDownsamplingPass extends Pass {}
export class EffectPass extends Pass {}

export class EffectComposer {
  addPass() {}
  render() {}
  dispose() {}
}

export const BlendFunction = {
  NORMAL: 0,
  ADD: 1,
  MULTIPLY: 2,
  SCREEN: 3,
  OVERLAY: 4,
};

export class BloomEffect extends Effect {}
export class VignetteEffect extends Effect {}
export class ChromaticAberrationEffect extends Effect {}
export class DepthOfFieldEffect extends Effect {}

export default {
  Effect,
  Pass,
  RenderPass,
  NormalPass,
  DepthDownsamplingPass,
  EffectPass,
  EffectComposer,
  BlendFunction,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  DepthOfFieldEffect,
};
