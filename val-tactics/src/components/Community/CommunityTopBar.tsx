import styles from './CommunityTopBar.module.css'

interface Props {
  title: string
  onClose: () => void
  search?: string
  onSearch?: (v: string) => void
}

export default function CommunityTopBar({ title, onClose, search, onSearch }: Props) {
  return (
    <div className={styles.topbar}>
      <button className={styles.backBtn} onClick={onClose}>← 返回战术板</button>
      <span className={styles.title}>{title}</span>
      {onSearch && (
        <input
          className={styles.search}
          placeholder="搜索..."
          value={search || ''}
          onChange={e => onSearch(e.target.value)}
        />
      )}
    </div>
  )
}
