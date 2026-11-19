import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * A btile that can be dragged (mouse or touch) onto a drop zone, or simply
 * tapped / activated with Enter or Space – so drag-and-drop never blocks
 * keyboard or switch users.
 *
 * Drop zones are any element with `data-dropzone="<id>"`. On release the btile
 * reports which zone (if any) is under the pointer.
 */
interface Props {
  children: ReactNode
  label: string
  onDrop?: (zoneId: string) => void
  onActivate?: () => void
  disabled?: boolean
  selected?: boolean
  className?: string
}

export function DraggableTile({ children, label, onDrop, onActivate, disabled, selected, className = '' }: Props) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      drag={!disabled && !!onDrop}
      dragSnapToOrigin
      dragElastic={0.6}
      whileDrag={{ scale: 1.12, zIndex: 50, boxShadow: '0 18px 40px -12px rgba(76,56,180,.45)' }}
      onDragEnd={(_e, info) => {
        const els = document.elementsFromPoint(info.point.x - window.scrollX, info.point.y - window.scrollY)
        const zone = els.find((el) => (el as HTMLElement).dataset?.dropzone) as HTMLElement | undefined
        if (zone?.dataset.dropzone) onDrop?.(zone.dataset.dropzone)
      }}
      onClick={() => onActivate?.()}
      className={`btile touch-none ${selected ? 'border-primary ring-4 ring-primary/25' : ''} ${className}`}
    >
      {children}
    </motion.button>
  )
}
