import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold tracking-wide transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#00d4ff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080c14]",
  {
    variants: {
      variant: {
        default: 'bg-[#00d4ff] text-[#080c14] hover:bg-[#00d4ff]/90 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]',
        destructive:
          'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
        outline:
          'border border-[#00d4ff]/30 bg-transparent text-[#00d4ff] hover:bg-[#00d4ff]/10 hover:border-[#00d4ff]/50',
        secondary:
          'bg-[#1a2332] text-gray-200 border border-[#00d4ff]/10 hover:bg-[#1a2332]/80 hover:border-[#00d4ff]/20',
        ghost:
          'text-gray-400 hover:bg-[#00d4ff]/10 hover:text-[#00d4ff]',
        link: 'text-[#00d4ff] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
