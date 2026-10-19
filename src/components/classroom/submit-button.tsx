'use client'
import {useFormStatus} from 'react-dom'
import styles from './workspace.module.css'
export function ClassroomSubmit({label,pendingLabel}:{label:string;pendingLabel:string}) {
  const {pending}=useFormStatus()
  return <button className={styles.primary} type="submit" disabled={pending} aria-disabled={pending}>{pending ? pendingLabel : label}</button>
}
