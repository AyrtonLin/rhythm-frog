/**
 * 节奏奶蛙 · 谱面生成
 * 谱面与音乐同源：直接从歌曲事件生成判定物，天然与鼓点/旋律对齐。
 */
import type { SongSpec } from './audio'
import { stepDur, type SongPlan } from './music'

export interface ChartNote {
  /** 判定时间（相对音频时钟，秒） */
  t: number
  /** 曲谱音高（midi 编号，用于配色/音效） */
  pitch: number
  /** 轨道 0-3（tap 模式恒为 0） */
  lane: number
  hit: boolean
  result: 'none' | 'perfect' | 'good' | 'miss'
}

const mulberry32 = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let z = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z
  return ((z ^ (z >>> 14)) >>> 0) / 4294967296
}

/** 单键点触谱面：主旋律音符 + 低音点睛 */
export function buildTapChart(spec: SongSpec, plan: SongPlan): ChartNote[] {
  const sd = stepDur(plan)
  const raw: ChartNote[] = spec.lead.map((e) => ({
    t: e.t,
    pitch: 0,
    lane: 0,
    hit: false,
    result: 'none',
  }))
  raw.sort((a, b) => a.t - b.t)
  // 最小间隔 1.6 步，避免过密难打
  const minGap = sd * 1.6
  const out: ChartNote[] = []
  for (const n of raw) {
    if (out.length === 0 || n.t - out[out.length - 1].t >= minGap) out.push(n)
  }
  return out
}

/** 四轨下落谱面：旋律按音高分配轨道 */
export function buildLaneChart(spec: SongSpec): ChartNote[] {
  const events = [...spec.lead].sort((a, b) => a.t - b.t)
  if (events.length === 0) return []
  const pitches = events.map((e) => e.freq)
  const lo = Math.min(...pitches)
  const hi = Math.max(...pitches)
  const range = Math.max(1, hi - lo)

  const out: ChartNote[] = []
  let lastT = -1
  let lastLane = -1
  for (const e of events) {
    if (out.length > 0 && e.t - lastT < 0.001) continue // 同一时刻只取一个音符
    let lane = Math.min(3, Math.floor(((e.freq - lo) / range) * 4))
    // 避免同轨连点，间隔过近换轨
    if (lane === lastLane && e.t - lastT < 0.24) lane = (lane + 1 + Math.floor(Math.random() * 3)) % 4
    out.push({ t: e.t, pitch: Math.round(69 + 12 * Math.log2(e.freq / 440)), lane, hit: false, result: 'none' })
    lastT = e.t
    lastLane = lane
  }
  return out
}

export interface EchoRound {
  /** 音块开始时间（秒） */
  start: number
  /** 玩家输入截止时间（秒） */
  inputEnd: number
  tones: { t: number; pad: number }[]
}

/** 回声（记忆接龙）模式：3 小节一轮，第一小节示范，剩余时间复现 */
export function buildEchoRounds(spec: SongSpec, plan: SongPlan): EchoRound[] {
  const barDur = stepDur(plan) * 16
  const rng = mulberry32(plan.bpm * plan.bars + plan.key)
  const rounds: EchoRound[] = []
  const lens = [3, 3, 4, 4, 5, 5, 6]
  let degree = 0
  for (let i = 0; plan.countIn + i * 3 + 3 <= spec.bars; i++) {
    const start = (plan.countIn + i * 3) * barDur
    const len = lens[i % lens.length]
    const tones: { t: number; pad: number }[] = []
    for (let j = 0; j < len; j++) {
      // 随机游走选音，整体在音阶上起伏
      const stepChoice = Math.floor(rng() * 3) - 1 // -1/0/+1
      degree = Math.max(0, Math.min(9, degree + stepChoice))
      tones.push({ t: start + j * 0.42, pad: degree % 4 })
    }
    rounds.push({ start, inputEnd: start + barDur * 3 - 0.25, tones })
  }
  return rounds
}
