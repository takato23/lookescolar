// SSR stub for @react-three/drei
// This replaces the entire drei package on the server side to prevent
// conflicts with Next.js HtmlContext during static generation

// Export empty/null versions of commonly used drei components
export const Html = () => null;
export const Scroll = () => null;
export const ScrollControls = () => null;
export const Float = () => null;
export const Environment = () => null;
export const useScroll = () => ({ offset: 0, delta: 0 });
export const MeshTransmissionMaterial = () => null;
export const PerspectiveCamera = () => null;
export const Sphere = () => null;
export const useTexture = () => null;
export const Loader = () => null;

// Default export
export default {
  Html,
  Scroll,
  ScrollControls,
  Float,
  Environment,
  useScroll,
  MeshTransmissionMaterial,
  PerspectiveCamera,
  Sphere,
  useTexture,
  Loader,
};
