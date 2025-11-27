// SSR stub for @react-three/fiber
// This replaces the fiber package on the server side

export const Canvas = () => null;
export const useThree = () => ({
  camera: null,
  scene: null,
  gl: null,
  size: { width: 0, height: 0 },
  viewport: { width: 0, height: 0 },
});
export const useFrame = () => {};
export const extend = () => {};
export const createRoot = () => ({
  render: () => {},
  unmount: () => {},
});

export default {
  Canvas,
  useThree,
  useFrame,
  extend,
  createRoot,
};
