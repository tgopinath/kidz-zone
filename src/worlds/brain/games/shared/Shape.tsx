export type ShapeKind =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'hexagon'
  | 'heart'
  | 'pentagon'
  | 'arrow'
  | 'cross'
  | 'moon'
  | 'lshape'

export const SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'heart', 'pentagon', 'cross', 'moon']
/** Shapes whose rotation is visible (asymmetric) – for rotation games. */
export const ASYMMETRIC: ShapeKind[] = ['arrow', 'lshape', 'triangle', 'moon', 'heart']

export const PALETTE = [
  { name: 'red', hex: '#F0506E' },
  { name: 'blue', hex: '#3898FF' },
  { name: 'green', hex: '#35C98B' },
  { name: 'yellow', hex: '#FFC43D' },
  { name: 'purple', hex: '#7557F6' },
  { name: 'orange', hex: '#FF8A3D' },
  { name: 'pink', hex: '#FF6FCF' },
  { name: 'teal', hex: '#19B5B0' },
] as const

const PATHS: Record<ShapeKind, string> = {
  circle: 'M50 8a42 42 0 1 0 0.01 0Z',
  square: 'M12 12h76v76H12Z',
  triangle: 'M50 8 92 88H8Z',
  diamond: 'M50 6 92 50 50 94 8 50Z',
  star: 'M50 6l12.9 27.6 30.1 3.6-22.3 20.6 5.9 29.8L50 72.8 23.4 87.6l5.9-29.8L7 37.2l30.1-3.6Z',
  hexagon: 'M27 10h46l23 40-23 40H27L4 50Z',
  heart: 'M50 88S8 62 8 34a20 20 0 0 1 42-10 20 20 0 0 1 42 10c0 28-42 54-42 54Z',
  pentagon: 'M50 6l44 32-17 52H23L6 38Z',
  arrow: 'M10 38h46V16l36 34-36 34V62H10Z',
  cross: 'M36 8h28v28h28v28H64v28H36V64H8V36h28Z',
  moon: 'M62 8a42 42 0 1 0 30 62A34 34 0 1 1 62 8Z',
  lshape: 'M14 8h26v58h46v26H14Z',
}

interface ShapeProps {
  kind: ShapeKind
  color?: string
  size?: number | string
  rotate?: number
  flip?: boolean
  outline?: boolean
  className?: string
  title?: string
}

export function Shape({ kind, color = '#7557F6', size = 48, rotate = 0, flip = false, outline = false, className, title }: ShapeProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g transform={`rotate(${rotate} 50 50)${flip ? ' translate(100 0) scale(-1 1)' : ''}`}>
        <path
          d={PATHS[kind]}
          fill={outline ? 'none' : color}
          stroke={outline ? color : 'rgba(0,0,0,0.12)'}
          strokeWidth={outline ? 6 : 2}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
