/**
 * 节奏奶蛙 · 本地进度（localStorage）
 */
export interface LevelBest {
  score: number
  stars: number
}

export interface SaveData {
  results: Record<number, LevelBest>
}

const KEY = 'rithmetic-frog-save-v1'

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as SaveData
  } catch {
    /* 忽略脏数据 */
  }
  return { results: {} }
}

function persist(data: SaveData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function getBest(level: number): LevelBest | undefined {
  return loadSave().results[level]
}

/** 记录成绩（0 星也记录=视为通关），返回是否刷新纪录 */
export function recordResult(level: number, score: number, stars: number): boolean {
  const data = loadSave()
  const prev = data.results[level]
  const better = !prev || score > prev.score || stars > prev.stars
  if (better) {
    data.results[level] = {
      score: Math.max(prev?.score ?? 0, score),
      stars: Math.max(prev?.stars ?? 0, stars),
    }
    persist(data)
  }
  return better
}

/** 第 level 关是否已解锁：第 0 关常开，其余通关上一关（0 星也算通关）即解锁 */
export function isUnlocked(level: number): boolean {
  if (level <= 0) return true
  return loadSave().results[level - 1] !== undefined
}

export const TOTAL_LEVELS = 5
