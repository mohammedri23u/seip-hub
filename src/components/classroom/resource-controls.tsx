'use client'

import styles from './resource-print.module.css'

export function ResourcePrintButton() {
  return <button className={styles.button} type="button" onClick={() => window.print()}>طباعة أو حفظ PDF</button>
}
