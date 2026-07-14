// Global types for the <dorm-room> custom element (components/dorm/dorm-room.js).
// Ambient on purpose: the JSX augmentation for a custom element must land on
// the global JSX namespace, and the engine's types are shared across routes,
// components, and the element itself.

// three@0.158.0 ships no bundled types and the app only passes the namespace
// through to window.THREE, so a shorthand any-typed module beats carrying
// @types/three for one import site.
declare module 'three'

interface DormRoomState {
  mode: 'day' | 'night'
  lightsOn: boolean
  computerOn: boolean
  tvOn: boolean
  curtainsOpen: boolean
  fansOn: boolean
}

type DormWall = 'north' | 'west'

interface DormFloorPlacement {
  kind: 'floor'
  x: number
  z: number
  rotY: number
  stored?: boolean
}

interface DormWallPlacement {
  kind: 'wall'
  wall: DormWall
  u: number
  y: number
  stored?: boolean
}

interface DormMovableInfo {
  id: string
  label: string
  custom: boolean
  kind: 'floor' | 'wall'
  stored: boolean
}

type DormPlacement = DormFloorPlacement | DormWallPlacement
type DormLayout = Record<string, DormPlacement>

interface DormSelection {
  id: string
  label: string
  custom: boolean
  kind: 'floor' | 'wall'
}

interface DormSpecPart {
  shape: 'box' | 'cylinder'
  size?: [number, number, number]
  radius?: number
  radiusTop?: number
  height?: number
  position: [number, number, number]
  rotationY?: number
  color?: string
  roughness?: number
  metalness?: number
}

interface DormItemSpec {
  name?: string
  parts: DormSpecPart[]
}

interface DormCustomItem {
  id: string
  name: string
  dims: { w: number; d: number; h: number }
  spec: DormItemSpec
  image_path: string | null
}

interface DormRoomElement extends HTMLElement {
  setRoomState(partial: Partial<DormRoomState>): void
  getRoomState(): DormRoomState
  setEditMode(on: boolean): void
  resetView(): void
  zoomBy(factor: number): void
  getLayout(): DormLayout
  getDefaultLayout(): DormLayout
  applyLayout(map: Partial<DormLayout>): void
  resetLayout(): void
  rotateItem(id: string, deltaDeg: number): void
  resetItem(id: string): void
  storeItem(id: string): void
  restoreItem(id: string): void
  listMovables(): DormMovableInfo[]
  addCustomItem(id: string, spec: DormItemSpec, placement?: DormPlacement): DormPlacement
  removeCustomItem(id: string): void
  clearSelection(): void
  _autoRotate?: boolean
}

declare namespace JSX {
  interface IntrinsicElements {
    'dorm-room': import('react').DetailedHTMLProps<
      import('react').HTMLAttributes<DormRoomElement>,
      DormRoomElement
    >
  }
}
