<template>
  <section class="scene-card">
    <div class="scene-card__header">
      <div>
        <p class="scene-card__eyebrow">Three.js Building View</p>
        <h2>Two-story occupancy model</h2>
      </div>
      <div class="scene-card__hint">Drag to rotate. Scroll to zoom. Click a room for details.</div>
    </div>
    <div ref="canvasHost" class="scene-card__canvas"></div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const props = defineProps({
  floors: {
    type: Array,
    default: () => []
  },
  colorMode: {
    type: String,
    default: "occupancy"
  },
  exploded: {
    type: Boolean,
    default: false
  },
  upperFloorVisible: {
    type: Boolean,
    default: true
  },
  roomOpacity: {
    type: Number,
    default: 0.9
  }
});

const emit = defineEmits(["select-room"]);
const canvasHost = ref(null);

let scene;
let camera;
let renderer;
let controls;
let animationFrame;
let raycaster;
let pointer;
let roomMeshes = [];
let occupantMeshes = [];

function occupancyColor(rate) {
  const clamped = THREE.MathUtils.clamp(rate, 0, 1);
  const hue = 0.33 - clamped * 0.33;
  const color = new THREE.Color();
  color.setHSL(hue, 0.78, 0.5);
  return color;
}

function energyColor(load) {
  const clamped = THREE.MathUtils.clamp(load / 100, 0, 1);
  const hue = 0.38 - clamped * 0.38;
  const color = new THREE.Color();
  color.setHSL(hue, 0.78, 0.55);
  return color;
}

function disposeScene() {
  cancelAnimationFrame(animationFrame);

  controls?.dispose();

  if (renderer) {
    renderer.dispose();
    renderer.domElement?.removeEventListener("click", onPointerClick);
  }

  roomMeshes.forEach((mesh) => {
    mesh.geometry.dispose();
    mesh.material.dispose();
  });

  occupantMeshes.forEach((mesh) => {
    mesh.geometry.dispose();
    mesh.material.dispose();
  });

  roomMeshes = [];
  occupantMeshes = [];

  if (canvasHost.value && renderer?.domElement && canvasHost.value.contains(renderer.domElement)) {
    canvasHost.value.removeChild(renderer.domElement);
  }
}

function onPointerClick(event) {
  if (!renderer || !camera) return;

  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(roomMeshes);

  if (intersections[0]?.object?.userData?.room) {
    emit("select-room", intersections[0].object.userData.room);
  }
}

function createOccupant(x, y, z) {
  const bodyGeometry = new THREE.CapsuleGeometry(0.14, 0.42, 3, 6);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xf3f7ff,
    roughness: 0.55,
    metalness: 0.05
  });

  const headGeometry = new THREE.SphereGeometry(0.12, 12, 12);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0x8ce1ff,
    roughness: 0.45,
    metalness: 0.08
  });

  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.set(x, y + 0.32, z);

  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(x, y + 0.78, z);

  scene.add(body);
  scene.add(head);
  occupantMeshes.push(body, head);
}

function addOccupants(room, floorY) {
  const count = Math.max(0, room.occupied);
  if (!count) return;

  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / columns);
  const xStep = room.width / (columns + 1);
  const zStep = room.depth / (rows + 1);

  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = room.x - room.width / 2 + xStep * (column + 1);
    const z = room.z - room.depth / 2 + zStep * (row + 1);
    createOccupant(x, floorY + 0.18, z);
  }
}

function addBuilding() {
  const slabGeometry = new THREE.BoxGeometry(26, 0.45, 18);
  const slabMaterial = new THREE.MeshStandardMaterial({
    color: 0xe4eefc,
    metalness: 0.15,
    roughness: 0.7
  });

  props.floors.forEach((floor, floorIndex) => {
    if (floorIndex === 1 && !props.upperFloorVisible) {
      return;
    }

    const explodedYOffset = props.exploded && floorIndex > 0 ? floorIndex * 4 : 0;
    const slab = new THREE.Mesh(slabGeometry, slabMaterial.clone());
    slab.position.set(0, floor.y + explodedYOffset - 0.5, 0);
    scene.add(slab);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(26, 0.5, 18)),
      new THREE.LineBasicMaterial({ color: 0x2a3d66 })
    );
    outline.position.copy(slab.position);
    scene.add(outline);

    floor.rooms.forEach((room) => {
      const roomGeometry = new THREE.BoxGeometry(room.width, 2.4, room.depth);
      const roomMaterial = new THREE.MeshStandardMaterial({
        color:
          props.colorMode === "energy"
            ? energyColor(room.hvacLoad)
            : occupancyColor(room.occupancyRate),
        transparent: true,
        opacity: props.roomOpacity,
        metalness: 0.05,
        roughness: 0.4
      });

      const mesh = new THREE.Mesh(roomGeometry, roomMaterial);
      mesh.position.set(room.x, floor.y + explodedYOffset + 1.2, room.z);
      mesh.userData.room = {
        ...room,
        floorName: floor.name,
        floorIndex: floorIndex + 1
      };

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(roomGeometry),
        new THREE.LineBasicMaterial({ color: 0x11213d })
      );
      edges.position.copy(mesh.position);

      scene.add(mesh);
      scene.add(edges);
      roomMeshes.push(mesh);
      addOccupants(room, floor.y + explodedYOffset);
    });
  });
}

function handleResize() {
  if (!canvasHost.value || !camera || !renderer) return;

  const { clientWidth, clientHeight } = canvasHost.value;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight);
}

function animate() {
  animationFrame = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function initScene() {
  if (!canvasHost.value) return;

  disposeScene();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07111f);
  scene.fog = new THREE.Fog(0x07111f, 28, 65);

  camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
  camera.position.set(18, 18, 22);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  canvasHost.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 16;
  controls.maxDistance = 48;
  controls.target.set(0, 5, 0);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.6);
  mainLight.position.set(16, 24, 10);
  const fillLight = new THREE.DirectionalLight(0x78a6ff, 0.7);
  fillLight.position.set(-10, 12, -12);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(24, 48),
    new THREE.MeshStandardMaterial({ color: 0x0d1b31, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;

  scene.add(ambientLight, mainLight, fillLight, ground);
  addBuilding();
  handleResize();
  renderer.domElement.addEventListener("click", onPointerClick);
  animate();
}

watch(
  () => [props.floors, props.colorMode, props.exploded, props.upperFloorVisible, props.roomOpacity],
  ([floors]) => {
    if (floors.length) {
      initScene();
    }
  },
  { deep: true }
);

onMounted(() => {
  window.addEventListener("resize", handleResize);
  if (props.floors.length) {
    initScene();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  disposeScene();
});
</script>
