/**
 * 节奏奶蛙 · 音乐数据
 * 每关一首风格化小曲，全部由数据 + 确定性算法生成：
 * 按小节和弦进行展开旋律动机 → 音频事件（audio.ts 合成）与谱面（chart.ts 判定）同源。
 */
import type { AudioEvent, SongSpec, WaveName } from './audio'
import { midiToFreq } from './audio'

const STEPS_PER_BAR = 16

/** 自然大调 */
const MAJOR = [0, 2, 4, 5, 7, 9, 11]

/** 音阶度数 → 半音数（允许越八度） */
function degreeToSemis(scale: number[], degree: number): number {
  const n = scale.length
  const oct = Math.floor(degree / n)
  const idx = ((degree % n) + n) % n
  return scale[idx] + oct * 12
}

/** 打击乐节奏型（每小节 16 步的 0/1 序列） */
const DRUMS: Record<string, { kick: number[]; snare: number[]; hat: number[] }> = {
  soft: { kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
  pop: { kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], hat: [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0] },
  chip: { kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0] },
  edm: { kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1] },
}

export interface SongPlan {
  id: string
  bpm: number
  bars: number
  countIn: number
  key: number
  prog: number[]
  leadMotifs: ((number | null)[] | null)[]
  bassMotif: (number | null)[]
  drum: keyof typeof DRUMS
  leadWave: WaveName
  bassWave: WaveName
  leadGain: number
  padEvery: number
}

function makeMotif(notes: (number | null)[]): (number | null)[] {
  const m = new Array<number | null>(STEPS_PER_BAR).fill(null)
  for (let i = 0; i < Math.min(notes.length, STEPS_PER_BAR); i++) m[i] = notes[i]
  return m
}

/** 各关歌曲蓝图（2 小节起拍给玩家预备，结尾 1 小节渐出） */
export const SONG_PLANS: SongPlan[] = [
  {
    id: 'dewpond',
    bpm: 84,
    bars: 20,
    countIn: 2,
    key: 60, // C4
    prog: [0, 0, 5, 5, 3, 3, 4, 4, 0, 0, 5, 5, 3, 3, 4, 4, 0, 5, 3, 4], // C G Am Em... 度数索引
    leadMotifs: [
      makeMotif([0, null, null, 2, null, 4, null, null, 6, null, 4, null, 2, null, null, null]),
      makeMotif([4, null, 4, null, 6, null, 4, null, 2, null, 0, null, null, null, null, null]),
      makeMotif([7, null, null, 6, null, 4, null, null, 2, null, 4, null, 0, null, null, null]),
    ],
    bassMotif: makeMotif([0, null, null, null, null, null, null, null, 0, null, null, null, null, null, 0, null]),
    drum: 'soft',
    leadWave: 'triangle',
    bassWave: 'sine',
    leadGain: 0.3,
    padEvery: 2,
  },
  {
    id: 'bubblepop',
    bpm: 112,
    bars: 20,
    countIn: 2,
    key: 62, // D4
    prog: [0, 0, 4, 4, 5, 5, 3, 3, 0, 0, 4, 4, 5, 5, 3, 3, 0, 4, 5, 0],
    leadMotifs: [
      makeMotif([4, null, 2, 4, null, 4, null, 6, 7, null, 6, 4, null, null, null, null]),
      makeMotif([2, null, 2, 4, null, 2, null, 0, 4, null, null, 2, null, null, null, null]),
      makeMotif([7, 7, null, 6, null, 7, null, 9, 7, null, 6, null, 4, null, null, 2]),
    ],
    bassMotif: makeMotif([0, null, 0, null, 0, null, null, 0, 0, null, 0, null, 0, null, null, 0]),
    drum: 'pop',
    leadWave: 'square',
    bassWave: 'triangle',
    leadGain: 0.26,
    padEvery: 2,
  },
  {
    id: 'echo',
    bpm: 100,
    bars: 24,
    countIn: 2,
    key: 57, // A3
    prog: [0, 0, 3, 3, 5, 5, 4, 4, 0, 0, 3, 3, 5, 5, 4, 4, 0, 0, 3, 3, 5, 5, 4, 4],
    leadMotifs: [
      makeMotif([7, null, null, null, 4, null, null, null, 6, null, null, null, 2, null, null, null]),
      null,
      null,
    ],
    bassMotif: makeMotif([0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null]),
    drum: 'soft',
    leadWave: 'triangle',
    bassWave: 'sine',
    leadGain: 0.3,
    padEvery: 1,
  },
  {
    id: 'fastlane',
    bpm: 128,
    bars: 24,
    countIn: 2,
    key: 65, // F4
    prog: [0, 0, 5, 5, 3, 3, 4, 4, 0, 0, 5, 5, 3, 3, 4, 4, 0, 0, 5, 5, 3, 4, 5, 0],
    leadMotifs: [
      makeMotif([4, null, 4, 6, 7, null, 6, 4, 2, null, 2, 4, null, 4, 2, 0]),
      makeMotif([0, 2, null, 4, null, 4, 6, null, 7, 6, null, 4, 2, null, 0, null]),
      makeMotif([7, null, 9, 9, 7, null, 6, null, 4, 4, null, 6, 7, null, 6, 4]),
    ],
    bassMotif: makeMotif([0, null, 0, 0, null, 0, null, 0, 0, null, 0, 0, null, 0, null, 0]),
    drum: 'chip',
    leadWave: 'square',
    bassWave: 'triangle',
    leadGain: 0.24,
    padEvery: 2,
  },
  {
    id: 'bosswave',
    bpm: 144,
    bars: 28,
    countIn: 2,
    key: 69, // A4
    prog: [0, 0, 5, 5, 3, 3, 4, 4, 0, 0, 5, 5, 3, 3, 4, 4, 0, 0, 5, 5, 3, 3, 4, 4, 0, 4, 5, 0],
    leadMotifs: [
      makeMotif([7, 7, null, 6, 7, null, 9, 7, 6, null, 4, 6, 7, null, 6, 4]),
      makeMotif([4, 4, null, 2, 4, null, 6, 4, 2, 0, null, 2, 4, null, 2, 0]),
      makeMotif([9, null, 7, 9, 11, null, 9, 7, 6, null, 7, 6, 4, null, 2, 4]),
    ],
    bassMotif: makeMotif([0, 0, null, 0, null, 0, 0, null, 0, 0, null, 0, null, 0, 0, null]),
    drum: 'edm',
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    leadGain: 0.23,
    padEvery: 2,
  },
]

export const stepDur = (plan: SongPlan): number => 60 / plan.bpm / 4

export function buildSongSpec(plan: SongPlan): SongSpec {
  const sd = stepDur(plan)
  const lead: AudioEvent[] = []
  const bass: AudioEvent[] = []
  const drums: AudioEvent[] = []
  const pads: AudioEvent[] = []
  const drumPat = DRUMS[plan.drum]

  for (let bar = 0; bar < plan.bars; bar++) {
    const chordDeg = plan.prog[bar % plan.prog.length]
    const isLeadBar = bar >= plan.countIn && bar < plan.bars - 1
    const motif = isLeadBar ? plan.leadMotifs[(bar - plan.countIn) % plan.leadMotifs.length] : null

    if (motif) {
      for (let s = 0; s < STEPS_PER_BAR; s++) {
        const deg = motif[s]
        if (deg === null || deg === undefined) continue
        const midi = plan.key + degreeToSemis(MAJOR, chordDeg + deg)
        lead.push({ t: (bar * STEPS_PER_BAR + s) * sd, voice: 'lead', freq: midiToFreq(midi), dur: sd * 1.5 })
      }
    }

    // 贝斯： chord root 一个八度低
    const bassRoot = midiToFreq(plan.key + degreeToSemis(MAJOR, chordDeg) - 24)
    for (let s = 0; s < STEPS_PER_BAR; s++) {
      if (plan.bassMotif[s]) bass.push({ t: (bar * STEPS_PER_BAR + s) * sd, voice: 'bass', freq: bassRoot, dur: sd * 1.7 })
    }

    for (let s = 0; s < STEPS_PER_BAR; s++) {
      const t = (bar * STEPS_PER_BAR + s) * sd
      const isLast = bar === plan.bars - 1
      if (drumPat.kick[s] || (isLast && s === 0)) drums.push({ t, voice: 'kick', freq: 0, dur: 0 })
      if (drumPat.snare[s] && !isLast) drums.push({ t, voice: 'snare', freq: 0, dur: 0 })
      if (drumPat.hat[s] && !isLast) drums.push({ t, voice: 'hat', freq: 0, dur: 0 })
    }

    // 和弦垫：低八度根音持续整小节（稀疏铺底）
    if (bar % plan.padEvery === 0 && bar < plan.bars - 1) {
      const rootMidi = plan.key - 12 + degreeToSemis(MAJOR, chordDeg)
      pads.push({ t: bar * STEPS_PER_BAR * sd, voice: 'pad', freq: midiToFreq(rootMidi), dur: STEPS_PER_BAR * sd })
    }
  }

  return {
    id: plan.id,
    bpm: plan.bpm,
    bars: plan.bars,
    scale: MAJOR,
    leadWave: plan.leadWave,
    bassWave: plan.bassWave,
    leadGain: plan.leadGain,
    drumGain: 1,
    lead,
    bass,
    drums,
    pads,
  }
}
