import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-black hover:bg-[#1ed760] disabled:bg-accent/40 disabled:text-black/40 font-semibold',
  secondary:
    'bg-[#2a2a2a] text-white hover:bg-[#333] disabled:bg-[#1e1e1e] disabled:text-zinc-600 border border-[#3a3a3a]',
  danger:
    'bg-red-700 text-white hover:bg-red-600 disabled:bg-red-900/40 disabled:text-red-400',
  ghost:
    'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 disabled:text-zinc-600',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded',
  md: 'px-4 py-2 text-sm rounded-md',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps): React.ReactElement {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-accent/50
        cursor-pointer disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled ?? loading}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin h-3.5 w-3.5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
