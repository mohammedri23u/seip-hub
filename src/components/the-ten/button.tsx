import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'gold' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-[#1F6668] text-white hover:bg-[#195A5C] shadow-[0_10px_24px_rgba(31,102,104,0.16)]',
  secondary: 'border border-[#CFC2AA] bg-[#FFFDF8] text-[#17363A] hover:border-[#1F6668] hover:bg-white',
  gold: 'bg-[#D8A94E] text-[#17363A] hover:bg-[#E1B85E] shadow-[0_10px_24px_rgba(216,169,78,0.18)]',
  ghost: 'bg-transparent text-[#1F6668] hover:bg-[#EDF7F4]',
}

export function TheTenButton({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`min-h-11 rounded-[15px] px-4 py-2.5 text-sm font-black transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none ${variants[variant]} ${className}`}
    />
  )
}
