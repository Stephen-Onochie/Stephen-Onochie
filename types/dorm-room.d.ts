// Global types for the <dorm-room> custom element (components/dorm/dorm-room.js,
// a verbatim vanilla Three.js asset). Ambient on purpose: the JSX augmentation
// for a custom element must land on the global JSX namespace.

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

interface DormRoomElement extends HTMLElement {
  setRoomState(partial: Partial<DormRoomState>): void
  getRoomState(): DormRoomState
  setEditMode(on: boolean): void
  resetView(): void
  zoomBy(factor: number): void
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
