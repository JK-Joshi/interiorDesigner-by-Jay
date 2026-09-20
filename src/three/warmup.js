/**
 * Prepares the GPU before the first visible frame, one small task at a time,
 * so shader linking and texture uploads never freeze the page in one go.
 *
 * 1. Compile each distinct (material × geometry layout × shadow) program in its own task.
 * 2. Wait for the links (poll KHR_parallel_shader_compile when available), then resolve
 *    each program's uniforms and attributes in its own task.
 * 3. Upload every material texture in its own task.
 */
const TEXTURE_SLOTS = ['map', 'gradientMap', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap', 'bumpMap'];
const MAX_PARALLEL_WAIT = 5000;

const nextTask = () =>
  new Promise((resolve) => {
    if (globalThis.scheduler?.yield) globalThis.scheduler.yield().then(resolve, resolve);
    else setTimeout(resolve, 0);
  });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function containsLight(object) {
  let found = false;
  object.traverse((child) => {
    if (child.isLight) found = true;
  });
  return found;
}

/** One representative object per program variant. */
function collectVariants(scene) {
  const seen = new Set();
  const variants = [];
  scene.traverse((object) => {
    if (!(object.isMesh || object.isPoints || object.isLine) || !object.material || Array.isArray(object.material)) return;
    const layout = object.geometry ? Object.keys(object.geometry.attributes).join(',') : '';
    const key = `${object.material.id}|${object.receiveShadow ? 1 : 0}|${layout}`;
    if (seen.has(key)) return;
    seen.add(key);
    variants.push(object);
  });
  return variants;
}

function collectTextures(scene) {
  const textures = new Set();
  scene.traverse((object) => {
    const material = object.material;
    if (!material || Array.isArray(material)) return;
    for (const slot of TEXTURE_SLOTS) if (material[slot]?.isTexture) textures.add(material[slot]);
    if (material.uniforms) {
      for (const uniform of Object.values(material.uniforms)) if (uniform?.value?.isTexture) textures.add(uniform.value);
    }
  });
  return textures;
}

/**
 * @param {import('three').WebGLRenderer} gl
 * @param {{ cancelled: boolean }} job — set `cancelled` to stop between steps
 */
export async function warmup(gl, scene, camera, job) {
  const parallel = gl.extensions.has('KHR_parallel_shader_compile');
  const programs = new Set();

  for (const object of collectVariants(scene)) {
    if (job.cancelled) return;
    // compile(object, camera, scene) uses the scene's lights; an object that carries its
    // own lights would be counted twice and produce a different program — skip those.
    if (containsLight(object)) continue;
    gl.compile(object, camera, scene);
    const program = gl.properties.get(object.material).currentProgram;
    if (program) programs.add(program);
    await nextTask();
  }

  if (parallel) {
    const started = performance.now();
    while (!job.cancelled && performance.now() - started < MAX_PARALLEL_WAIT) {
      let pending = 0;
      programs.forEach((program) => {
        if (!program.isReady()) pending += 1;
      });
      if (pending === 0) break;
      await wait(16);
    }
  }
  // Uniform/attribute introspection happens on a program's first use; do it one program per
  // task here rather than for every program inside the first frame.
  for (const program of programs) {
    if (job.cancelled) return;
    program.getUniforms();
    program.getAttributes();
    await nextTask();
  }

  for (const texture of collectTextures(scene)) {
    if (job.cancelled) return;
    gl.initTexture(texture);
    await nextTask();
  }
}
