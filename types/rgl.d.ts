// Minimal local types for react-grid-layout v2 (hooks API). The published
// @types/react-grid-layout targets v1 and doesn't match the v2 runtime, so we
// declare only the surface this app uses.
declare module 'react-grid-layout' {
  import type { ComponentType, ReactNode, RefObject } from 'react'

  export interface RGLItem {
    i: string
    x: number
    y: number
    w: number
    h: number
    minW?: number
    minH?: number
    maxW?: number
    maxH?: number
    static?: boolean
  }

  export type RGLLayout = RGLItem[]

  // Opaque — the app never constructs a Compactor, only passes one through.
  export type Compactor = unknown

  export interface ResponsiveProps {
    className?: string
    layouts?: { [breakpoint: string]: RGLLayout }
    breakpoints?: { [breakpoint: string]: number }
    cols?: { [breakpoint: string]: number }
    width?: number
    rowHeight?: number
    margin?: [number, number]
    compactor?: Compactor
    dragConfig?: { bounded?: boolean }
    isDraggable?: boolean
    isResizable?: boolean
    draggableCancel?: string
    onLayoutChange?: (current: RGLLayout, all?: { [breakpoint: string]: RGLLayout }) => void
    children?: ReactNode
  }

  export const Responsive: ComponentType<ResponsiveProps>
  export const ResponsiveGridLayout: ComponentType<ResponsiveProps>

  export function getCompactor(
    compactType: 'horizontal' | 'vertical' | 'wrap' | null,
    allowOverlap?: boolean,
    preventCollision?: boolean
  ): Compactor
  export const noCompactor: Compactor

  export function useContainerWidth(): {
    width: number
    containerRef: RefObject<HTMLDivElement>
    mounted: boolean
  }
}
