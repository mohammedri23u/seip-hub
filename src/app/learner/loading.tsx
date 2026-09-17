'use client'
import { useI18n } from '@/components/i18n-provider'
export default function Loading() {
  const { tr } = useI18n()
  return <main className="ten-loading" aria-busy="true"><div className="ten-loading-mark" aria-hidden="true"/><p role="status">{tr('Opening your chronicle…', 'جارٍ فتح سِجلّ رحلتك…')}</p><span className="ten-eyebrow">THE TEN / BAGHDAD NEXUS</span></main>
}
