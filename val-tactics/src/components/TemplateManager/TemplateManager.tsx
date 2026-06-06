import { useState, useEffect, useCallback } from 'react'
import { db } from '../../utils/db'
import type { Template } from '../../types'
import { useTactics } from '../../store/TacticsContext'
import { useToast } from '../Toast/Toast'
import styles from './TemplateManager.module.css'

interface Props { onClose: () => void; mapId: string; onLoadMap: (mapId: string) => void; onExportImage: () => void; onShareLink: () => void }

export default function TemplateManager({ onClose, mapId, onLoadMap, onExportImage, onShareLink }: Props) {
  const { markers, drawings, textAnnotations, agentPositions, abilityShapes, strategyName, strategyDescription, roster, tracks, dispatch } = useTactics()
  const toast = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [name, setName] = useState(strategyName)
  const [desc, setDesc] = useState(strategyDescription)
  const hasContent = markers.length > 0 || drawings.length > 0 || abilityShapes.length > 0 || textAnnotations.length > 0 || agentPositions.length > 0
  const refresh = useCallback(async () => {
    const all = await db.templates.orderBy('updatedAt').reverse().toArray()
    setTemplates(all)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleSave = async () => {
    const n = name.trim()
    if (!n) { toast('请输入模板名称'); return }
    const tpl: Template = {
      id: Date.now().toString(),
      name: n,
      description: desc,
      mapId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      markers: markers.map(m => ({ ...m })),
      drawings: drawings.map(d => ({ ...d, points: d.points.map(p => ({ ...p })) })),
      textAnnotations: textAnnotations.map(t => ({ ...t })),
      agentPositions: agentPositions.map(a => ({ ...a })),
      abilityShapes: abilityShapes.map(s => ({ ...s })),
      roster: { ...roster, attack: [...roster.attack], defense: [...roster.defense] },
      tracks: tracks.map(t => ({ ...t })),
    }
    await db.templates.add(tpl)
    dispatch({ type: 'SET_STRATEGY_NAME', name: n })
    dispatch({ type: 'SET_STRATEGY_DESCRIPTION', desc })
    toast('保存成功')
    refresh()
  }

  const handleLoad = async (tpl: Template) => {
    dispatch({ type: 'LOAD_ALL', markers: tpl.markers, drawings: tpl.drawings || [], texts: tpl.textAnnotations || [], agents: tpl.agentPositions || [], shapes: tpl.abilityShapes || [], name: tpl.name, desc: tpl.description || '', roster: tpl.roster || { attack: [], defense: [] }, tracks: tpl.tracks || [] })
    if (tpl.mapId) onLoadMap(tpl.mapId)
    toast('模板已加载')
    onClose()
  }

  const handleDelete = async (id: string) => {
    await db.templates.delete(id)
    refresh()
  }

  const handleExport = () => {
    const data = {
      version: 2,
      exportedAt: Date.now(),
      strategyName,
      strategyDescription: desc,
      markers: markers.map(m => ({ abilityId: m.abilityId, agentId: m.agentId, x: m.x, y: m.y, step: m.step, time: m.time, note: m.note })),
      drawings: drawings.map(d => ({ ...d })),
      textAnnotations: textAnnotations.map(t => ({ ...t })),
      agentPositions: agentPositions.map(a => ({ ...a })),
      abilityShapes: abilityShapes.map(s => ({ ...s }))
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `tactics-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.markers || !Array.isArray(data.markers)) { toast('无效的战术文件格式'); return }
        dispatch({ type: 'LOAD_ALL', markers: data.markers.map((m: Record<string, unknown>, i: number) => ({ id: 'm_' + Date.now() + '_' + i, abilityId: m.abilityId as string, agentId: m.agentId as string, x: m.x as number, y: m.y as number, step: (m.step as number) || i + 1, time: (m.time as number) || (i * 5), note: (m.note as string) || '' })), drawings: (data.drawings || []) as Template['drawings'], texts: (data.textAnnotations || []) as Template['textAnnotations'], agents: (data.agentPositions || []) as Template['agentPositions'], shapes: (data.abilityShapes || []) as Template['abilityShapes'], name: (data.strategyName as string) || '', desc: (data.strategyDescription as string) || '', roster: { attack: [], defense: [] }, tracks: [] })
        onClose()
      } catch { toast('文件解析失败，请检查文件格式') }
    }
    input.click()
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>模板管理</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>
          {/* 保存 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>保存当前战术</div>
            <div className={styles.saveRow}>
              <input className={styles.input} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} placeholder="策略名称..." />
              <button className={styles.btnPrimary} onClick={handleSave}>保存</button>
            </div>
            <input className={`${styles.input} ${styles.inputMt}`} value={desc} onChange={e => setDesc(e.target.value)} placeholder="策略描述（可选）..." />
          </div>

          {/* 导入导出分享 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>导入 / 导出 / 分享</div>
            <div className={styles.actionRow}>
              <button className={styles.btn} onClick={handleExport} disabled={!hasContent}>导出 JSON</button>
              <button className={styles.btn} onClick={handleImport}>导入 JSON</button>
              <button className={styles.btn} onClick={onExportImage} disabled={!hasContent}>导出图片</button>
              <button className={styles.btn} onClick={onShareLink}>分享链接</button>
            </div>
          </div>

          {/* 模板列表 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>已保存的模板 ({templates.length})</div>
            {templates.length === 0 && <p className={styles.emptyText}>暂无保存的模板</p>}
            <div className={styles.templateList}>
              {templates.map(tpl => (
                <div key={tpl.id} className={styles.templateItem}>
                  <div className={styles.templateInfo}>
                    <span className={styles.templateName}>{tpl.name}</span>
                    {tpl.description && <span className={styles.templateDesc}>{tpl.description.substring(0, 60)}{tpl.description.length > 60 ? '...' : ''}</span>}
                    <span className={styles.templateMeta}>{tpl.markers.length} 标记 · {formatDate(tpl.updatedAt)}</span>
                  </div>
                  <div className={styles.templateActions}>
                    <button className={styles.btnSm} onClick={() => handleLoad(tpl)}>加载</button>
                    <button className={styles.btnSmDanger} onClick={() => handleDelete(tpl.id)}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
