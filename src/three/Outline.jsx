import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { BackSide, Color, ShaderMaterial, Vector2 } from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Lightweight inverted-hull outline for the "vector 3D" look.
 * Same technique as drei's <Outlines> (constant screen-space thickness), but
 * creased geometries and materials are cached and shared across meshes —
 * the scene has ~150 outlined parts that reuse a handful of geometries.
 */
const creasedCache = new WeakMap();
const materialCache = new Map();
const drawingBuffer = new Vector2(1, 1);

export function creased(geometry) {
  let result = creasedCache.get(geometry);
  if (!result) {
    result = toCreasedNormals(geometry, Math.PI);
    creasedCache.set(geometry, result);
  }
  return result;
}

// Skinning chunks compile to nothing for ordinary meshes, so one shader serves both.
const vertexShader = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  #include <clipping_planes_pars_vertex>
  uniform float thickness;
  uniform vec2 size;
  void main() {
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
    #include <clipping_planes_vertex>
    vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    vec4 clipNormal = projectionMatrix * modelViewMatrix * vec4(objectNormal, 0.0);
    vec2 offset = normalize(clipNormal.xy) * thickness / size * clipPosition.w * 2.0;
    clipPosition.xy += offset;
    gl_Position = clipPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  void main() {
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export function getOutlineMaterial(color, thickness) {
  const key = `${color}|${thickness.toFixed(2)}`;
  let material = materialCache.get(key);
  if (!material) {
    material = new ShaderMaterial({
      uniforms: {
        color: { value: new Color(color) },
        thickness: { value: thickness },
        size: { value: drawingBuffer },
      },
      vertexShader,
      fragmentShader,
      side: BackSide,
    });
    materialCache.set(key, material);
  }
  return material;
}

/** Keeps the shared `size` uniform in sync with the drawing buffer. */
export function OutlineSizeSync() {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  useEffect(() => {
    gl.getDrawingBufferSize(drawingBuffer);
  }, [gl, size, dpr]);
  return null;
}

/**
 * Render as a child of the mesh it outlines, passing the same geometry:
 *   <mesh geometry={g}><Outline geometry={g} thickness={2} /></mesh>
 * `thickness` is in device pixels.
 */
export default function Outline({ geometry, thickness = 1.6, color = '#120f0d' }) {
  const hull = useMemo(() => (geometry ? creased(geometry) : null), [geometry]);
  const material = useMemo(() => getOutlineMaterial(color, thickness), [color, thickness]);
  if (!hull) return null;
  return <mesh geometry={hull} material={material} raycast={() => null} />;
}
