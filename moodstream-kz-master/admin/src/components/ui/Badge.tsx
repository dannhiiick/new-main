import React from 'react'

export type BadgeVariant = 'green' | 'yellow' | 'red' | 'gray' | 'blue'

export interface BadgeProps {
  label: string
  variant: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-green-950/30 text-green-300',
  yellow: 'bg-yellow-950/30 text-yellow-300',
  red: 'bg-red-950/30 text-red-300',
  gray: 'bg-[#202024] text-zinc-400',
  blue: 'bg-blue-950/30 text-blue-300',
}

export function Badge({ label, variant }: BadgeProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide ${variantClasses[variant]}`}
    >
      {label}
    </span>
  )
}
