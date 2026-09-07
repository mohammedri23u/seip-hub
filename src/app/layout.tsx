import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SEIP Hub',
  description: 'Learning, assessment, and analytics for SEIP',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
