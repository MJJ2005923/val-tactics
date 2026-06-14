import { useState, useRef } from 'react'
import { importCsv, generateCsvTemplate, addMatch } from '../../data/matchHistory'
import type { MatchImportResult } from '../../types'
import styles from './MatchImport.module.css'

interface Props {
  onImported?: () => void
  compact?: boolean
}

export default function MatchImport({ onImported, compact }: Props) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<MatchImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleParse = () => {
    const r = importCsv(text)
    setResult(r)
  }

  const handleImport = () => {
    if (!result || result.entries.length === 0) return
    // 直接保存所有条目
    const now = Date.now()
    result.entries.forEach((e, i) => {
      e.timestamp = now - i * 1000
      addMatch(e)
    })
    setText('')
    setResult(null)
    onImported?.()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(reader.result as string)
      setResult(null)
    }
    reader.readAsText(file)
    // 清空input以便重新选同一文件
    e.target.value = ''
  }

  const downloadTemplate = () => {
    const csv = generateCsvTemplate()
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '无畏契约比赛记录模板.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const cls = `${styles.container} ${compact ? styles.compact : ''}`

  return (
    <div className={cls}>
      <div className={styles.hint}>
        粘贴表格数据或上传CSV。格式：地图,特工,结果,K,D,A,ACS,HS%,段位,开局方
      </div>

      <textarea
        className={styles.textarea}
        value={text}
        onChange={e => { setText(e.target.value); setResult(null) }}
        placeholder={`亚海悬城,婕提,胜,22,12,6,245,23,超凡2,攻\n劫境之地,贤者,负,8,16,4,95,12,钻石1,守\n...`}
      />

      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleParse}>
          解析数据
        </button>
        <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => fileRef.current?.click()}>
          选择CSV文件
        </button>
        <button className={`${styles.btn} ${styles.btnOutline}`} onClick={downloadTemplate}>
          下载模板
        </button>
        <input
          ref={fileRef}
          className={styles.fileInput}
          type="file"
          accept=".csv,.txt"
          onChange={handleFile}
        />
      </div>

      {result && (
        <>
          <div className={`${styles.result} ${result.entries.length > 0 ? styles.resultSuccess : styles.resultError}`}>
            {result.entries.length > 0
              ? `✅ 识别到 ${result.entries.length} 条有效记录`
              : '⚠️ 未识别到有效记录'}
            {result.warningCount > 0 && `（${result.warningCount} 行有误）`}
          </div>

          {result.errors.length > 0 && (
            <div className={styles.errors}>
              {result.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          {result.entries.length > 0 && (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleImport}>
              导入 {result.entries.length} 条记录
            </button>
          )}
        </>
      )}
    </div>
  )
}
