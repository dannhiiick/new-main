import React from 'react'

export type BadgeVariant = 'green' | 'yellow' | 'red' | 'gray' | 'blue'

export interface BadgeProps {
  label: string
  variant: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-green-900/40 text-green-400 border border-green-800/50',
  yellow: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50',
  red: 'bg-red-900/40 text-red-400 border border-red-800/50',
  gray: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  blue: 'bg-blue-900/40 text-blue-400 border border-blue-800/50',
}

export function Badge({ label, variant }: BadgeProps): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]}`}
    >
      {label}
    </span>
  )
}
