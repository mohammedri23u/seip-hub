import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
const route = new URL('../../src/app/ten-ui-review/', import.meta.url)
if (process.argv.includes('--clean')) {
  await rm(route, { recursive: true, force: true })
  console.log('Local review route removed.')
} else {
  await mkdir(route, { recursive: true })
  await copyFile(new URL('./review-page.tsx', import.meta.url), new URL('review-client.tsx', route))
  await writeFile(new URL('page.tsx', route), `import { notFound } from 'next/navigation'
import ReviewPage from './review-client'
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <ReviewPage />
}
`)
  console.log('Temporary fixture route: /ten-ui-review. Block Supabase network requests in the review browser; clean this route before building or deploying.')
}
