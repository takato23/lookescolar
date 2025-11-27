// SSR stub for three.js
// This replaces the three package on the server side

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set() { return this; }
  copy() { return this; }
  add() { return this; }
  sub() { return this; }
  multiply() { return this; }
  divide() { return this; }
  normalize() { return this; }
  lerp() { return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
}

export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set() { return this; }
  clone() { return new Vector2(this.x, this.y); }
}

export class Color {
  constructor() {
    this.r = 0;
    this.g = 0;
    this.b = 0;
  }
  set() { return this; }
}

export class Object3D {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3(1, 1, 1);
  }
}

export class Mesh extends Object3D {}
export class Group extends Object3D {}
export class Scene extends Object3D {}
export class Camera extends Object3D {}
export class PerspectiveCamera extends Camera {}
export class OrthographicCamera extends Camera {}

export class BufferGeometry {}
export class PlaneGeometry extends BufferGeometry {}
export class BoxGeometry extends BufferGeometry {}
export class SphereGeometry extends BufferGeometry {}

export class Material {}
export class MeshBasicMaterial extends Material {}
export class MeshStandardMaterial extends Material {}
export class ShaderMaterial extends Material {}

export const DoubleSide = 2;
export const FrontSide = 0;
export const BackSide = 1;
export const HalfFloatType = 1016;
export const FloatType = 1015;
export const UnsignedByteType = 1009;

export class Texture {}
export class TextureLoader {
  load() { return new Texture(); }
}

export class WebGLRenderer {
  constructor() {
    this.domElement = null;
  }
  render() {}
  setSize() {}
  dispose() {}
}

export class WebGLRenderTarget {}

export default {
  Vector3,
  Vector2,
  Color,
  Object3D,
  Mesh,
  Group,
  Scene,
  Camera,
  PerspectiveCamera,
  OrthographicCamera,
  BufferGeometry,
  PlaneGeometry,
  BoxGeometry,
  SphereGeometry,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  DoubleSide,
  FrontSide,
  BackSide,
  HalfFloatType,
  FloatType,
  UnsignedByteType,
  Texture,
  TextureLoader,
  WebGLRenderer,
  WebGLRenderTarget,
};
