type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'accent' | 'gold'

const tones: Record<Tone, string> = {
  neutral: 'border-[#D8CCB6] bg-[#F4EEE2] text-[#5F6D6D]',
  success: 'border-[#A8D2C3] bg-[#EAF7F1] text-[#2F765F]',
  danger: 'border-[#E7B9B4] bg-[#FCEFED] text-[#9A4B44]',
  warning: 'border-[#E6C794] bg-[#FFF7E8] text-[#8A642D]',
  accent: 'border-[#A9DCDD] bg-[#EDF9F8] text-[#1F6668]',
  gold: 'border-[#E5C67A] bg-[#FFF7DD] text-[#8B6A2B]',
}

export function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.11em] ${tones[tone]}`}>
      {children}
    </span>
  )
}
