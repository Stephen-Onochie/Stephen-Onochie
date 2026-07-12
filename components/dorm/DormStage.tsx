'use client'

// The only module that imports three and dorm-room.js. dorm-room.js defines a
// custom element at module scope (touches window/HTMLElement), so this file
// must only ever be loaded through next/dynamic with ssr: false.
import * as THREE from 'three'
import '@/components/dorm/dorm-room.js'

// dorm-room.js reads Three.js off window.THREE (it polls until present).
;(window as Window & { THREE?: unknown }).THREE = THREE

export default function DormStage({
  onElement,
}: {
  onElement: (el: DormRoomElement | null) => void
}) {
  return (
    <div className="absolute inset-0">
      <dorm-room ref={onElement} />
    </div>
  )
}
