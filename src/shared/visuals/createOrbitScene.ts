import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer,
} from 'three';

/** Demand-rendered Three.js scene. No idle animation loop or remote assets. */
export function createOrbitScene(host: HTMLElement, reducedMotion: boolean) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    host.dataset.renderer = 'fallback';
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'three-orbit-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);

  const scene = new Scene();
  const camera = new OrthographicCamera(-2.2, 2.2, 2.2, -2.2, 0.1, 20);
  camera.position.set(0, 0, 6);
  const group = new Group();
  scene.add(group);
  const material = new MeshStandardMaterial({
    color: new Color('#D8CFC4'),
    metalness: 0.3,
    roughness: 0.52,
  });
  const geometry = new SphereGeometry(1.25, 64, 48);
  const sphere = new Mesh(geometry, material);
  group.add(sphere);
  const ringMaterial = new MeshBasicMaterial({
    color: '#D8CFC4',
    transparent: true,
    opacity: 0.85,
  });
  const ringGeometries: TorusGeometry[] = [];
  for (const radius of [0.43, 0.69, 0.95, 1.13]) {
    const ringGeometry = new TorusGeometry(radius, 0.005, 6, 120);
    ringGeometries.push(ringGeometry);
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.position.z = Math.sqrt(1.25 ** 2 - radius ** 2) + 0.014;
    group.add(ring);
  }
  const coreGeometry = new SphereGeometry(0.235, 40, 24);
  const coreMaterial = new MeshBasicMaterial({ color: '#0D1A2B' });
  const core = new Mesh(coreGeometry, coreMaterial);
  core.scale.z = 0.24;
  core.position.z = 1.27;
  group.add(core);
  const ambient = new AmbientLight('#FFFFFF', 1.8);
  const key = new DirectionalLight('#FFFFFF', 5);
  key.position.set(-3, 4, 3);
  const fill = new DirectionalLight('#5A5F66', 0.8);
  fill.position.set(2, -3, 1);
  scene.add(ambient, key, fill);
  let frame = 0;
  let visible = true;
  let disposed = false;
  let lost = false;
  let targetX = 0;
  let targetY = 0;
  const render = () => {
    if (!disposed && !lost && visible && !document.hidden) renderer.render(scene, camera);
  };
  const settle = () => {
    frame = 0;
    if (disposed || lost || !visible || document.hidden || reducedMotion) return;
    group.rotation.x += (targetX - group.rotation.x) * 0.14;
    group.rotation.y += (targetY - group.rotation.y) * 0.14;
    render();
    if (Math.abs(targetX - group.rotation.x) + Math.abs(targetY - group.rotation.y) > 0.0002) {
      host.dataset.motion = 'settling';
      frame = requestAnimationFrame(settle);
    } else host.dataset.motion = 'idle';
  };
  const requestRender = () => {
    if (!frame && !reducedMotion && visible && !document.hidden)
      frame = requestAnimationFrame(settle);
  };
  const move = (event: PointerEvent) => {
    if (reducedMotion || event.pointerType === 'touch') return;
    const bounds = host.getBoundingClientRect();
    targetY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.14;
    targetX = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.1;
    requestRender();
  };
  const leave = () => {
    targetX = 0;
    targetY = 0;
    requestRender();
  };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    const aspect = width / height;
    camera.left = -2.2 * aspect;
    camera.right = 2.2 * aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  };
  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    host.dataset.motion = reducedMotion ? 'reduced' : 'idle';
  };
  const visibility = () => {
    if (document.hidden) pause();
    else {
      render();
      requestRender();
    }
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    pause();
    host.dataset.renderer = 'fallback';
  };
  const onRestored = () => {
    lost = false;
    host.dataset.renderer = 'three';
    resize();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) pause();
    else {
      render();
      requestRender();
    }
  });
  intersection.observe(host);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave);
  document.addEventListener('visibilitychange', visibility);
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);
  host.dataset.renderer = 'three';
  host.dataset.motion = reducedMotion ? 'reduced' : 'idle';
  resize();
  return () => {
    disposed = true;
    pause();
    observer.disconnect();
    intersection.disconnect();
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerleave', leave);
    document.removeEventListener('visibilitychange', visibility);
    renderer.domElement.removeEventListener('webglcontextlost', onLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
    geometry.dispose();
    material.dispose();
    ringGeometries.forEach((ring) => ring.dispose());
    ringMaterial.dispose();
    coreGeometry.dispose();
    coreMaterial.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    delete host.dataset.renderer;
    delete host.dataset.motion;
  };
}
