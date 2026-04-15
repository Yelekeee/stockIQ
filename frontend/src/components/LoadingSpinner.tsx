import React from 'react'
import clsx from 'clsx'

interface Props { size?: 'sm' | 'md' | 'lg'; className?: string }

export default function LoadingSpinner({ size = 'md', className }: Props) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className={clsx(s, 'animate-spin rounded-full border-2 border-primary-500 border-t-transparent')} />
    </div>
  )
}
