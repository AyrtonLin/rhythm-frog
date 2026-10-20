/**
 * 节奏奶蛙 · 音频引擎
 * 用 Web Audio 程序化合成全部音乐（鼓 / 贝斯 / 主旋律 / 和弦垫），
 * 并以 AudioContext 时钟为唯一时间基准，保证音画同步。
 */

export type VoiceName = 'lead' | 'bass' | 'kick' | 'snare' | 'hat' | 'pad'
export type WaveName = 'square' | 'triangle' | 'sawtooth' | 'sine'

export interface AudioEvent {
  /** 播放时间（相对歌曲第 0 步，单位秒） */
  t: number
  voice: VoiceName
  freq: number
  dur: number
  gain?: number
}

/** 歌曲谱式规格（由 music.ts 填充） */
export interface SongSpec {
  id: string
  bpm: number
  bars: number
  scale: number[]
  leadWave: WaveName
  bassWave: WaveName
  leadGain: number
  drumGain: number
  /** 各声部事件，可由 buildSongEvents 生成 */
  lead: AudioEvent[]
  bass: AudioEvent[]
  drums: AudioEvent[]
  pads: AudioEvent[]
}

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12)

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null

  private timer: number | null = null
  private events: AudioEvent[] = []
  private cursor = 0
  private startAt = 0
  private endAt = 0
  private playing = false

  /** 首次交互时调用，创建并恢复 AudioContext（浏览器自动播放策略） */
  ensure(): AudioContext {
    if (this.ctx) return this.ctx
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.55
    this.master.connect(this.ctx.destination)

    // 预生成 1 秒白噪声，供打击乐使用
    const len = Math.floor(this.ctx.sampleRate)
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return this.ctx
  }

  resume(): void {
    this.ctx?.resume()
  }

  /** 音频时钟（秒）。未初始化时退化为 performance.now，保证游戏不崩 */
  now(): number {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000
  }

  /** 播放整首歌曲：精确调度所有音符事件，返回 {起始时间, 结束时间}(音频时钟) */
  playSong(spec: SongSpec): { startAt: number; endAt: number } {
    this.stopSong()
    const ctx = this.ensure()
    ctx.resume()
    this.playing = true
    this.startAt = ctx.currentTime + 0.25
    this.cursor = 0
    this.events = [...spec.lead, ...spec.bass, ...spec.drums, ...spec.pads].sort((a, b) => a.t - b.t)
    const last = this.events.length ? this.events[this.events.length - 1] : null
    this.endAt = this.startAt + (last ? last.t + 1.6 : 1)

    const tick = () => {
      if (!this.playing) return
      const ahead = this.now() + 0.16
      while (this.cursor < this.events.length) {
        const e = this.events[Math.min(this.cursor, this.events.length - 1)]
        const when = this.startAt + e.t
        if (when > ahead) break
        this.voice(e.voice, when, e.freq, e.dur, e.gain)
        this.cursor++
      }
    }
    this.timer = window.setInterval(tick, 40)
    tick()
    return { startAt: this.startAt, endAt: this.endAt }
  }

  stopSong(): void {
    this.playing = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.events = []
    this.cursor = 0
    if (this.master && this.ctx) {
      const g = this.master.gain
      const now = this.ctx.currentTime
      g.cancelScheduledValues(now)
      g.setValueAtTime(g.value, now)
      // 若之前被压到 0（探测静音），恢复音量
      if (g.value < 0.01) g.setValueAtTime(0.55, now)
    }
  }

  /** 立即播放单音（echo 模式音块 / UI 反馈） */
  tone(freq: number, dur = 0.28, wave: WaveName = 'square', gain = 0.32): void {
    const ctx = this.ensure()
    ctx.resume()
    this.voiceLead(ctx, ctx.currentTime + 0.005, freq, dur, wave, gain)
  }

  /** 击中反馈音 */
  hitFx(kind: 'perfect' | 'miss'): void {
    const ctx = this.ensure()
    ctx.resume()
    if (kind === 'perfect') this.tone(880, 0.09, 'triangle', 0.12)
    else this.tone(160, 0.14, 'square', 0.16)
  }

  // ---------------------------------------------------------------- 音色

  private voice(name: VoiceName, when: number, freq: number, dur: number, gain?: number): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    if (when < ctx.currentTime - 0.05) return
    if (name === 'lead') this.voiceLead(ctx, when, freq, dur, this.currentLeadWave, gain ?? this.currentLeadGain)
    else if (name === 'bass') this.voiceBass(ctx, when, freq, dur)
    else if (name === 'kick') this.voiceKick(ctx, when)
    else if (name === 'snare') this.voiceSnare(ctx, when)
    else if (name === 'hat') this.voiceHat(ctx, when)
    else if (name === 'pad') this.voicePad(ctx, when, freq, dur)
  }

  private currentLeadWave: WaveName = 'square'
  private currentLeadGain = 0.3

  setLead(wave: WaveName, gain: number): void {
    this.currentLeadWave = wave
    this.currentLeadGain = gain
  }

  private voiceLead(ctx: AudioContext, when: number, freq: number, dur: number, wave: WaveName, gain: number): void {
    const osc = ctx.createOscillator()
    osc.type = wave
    osc.frequency.setValueAtTime(freq, when)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(Math.min(7200, freq * 6 + 1200), when)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, when)
    env.gain.linearRampToValueAtTime(gain, when + 0.012)
    env.gain.exponentialRampToValueAtTime(0.001, when + dur)

    osc.connect(filter).connect(env).connect(this.master!)
    osc.start(when)
    osc.stop(when + dur + 0.05)
  }

  private voiceBass(ctx: AudioContext, when: number, freq: number, dur: number): void {
    const osc = ctx.createOscillator()
    osc.type = this.currentBassWave
    osc.frequency.setValueAtTime(freq, when)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(620, when)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, when)
    env.gain.linearRampToValueAtTime(0.36, when + 0.015)
    env.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.95)
    osc.connect(filter).connect(env).connect(this.master!)
    osc.start(when)
    osc.stop(when + dur)
  }

  private currentBassWave: WaveName = 'triangle'

  setBass(wave: WaveName): void {
    this.currentBassWave = wave
  }

  private voiceKick(ctx: AudioContext, when: number): void {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(165, when)
    osc.frequency.exponentialRampToValueAtTime(46, when + 0.11)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.95, when)
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.19)
    osc.connect(env).connect(this.master!)
    osc.start(when)
    osc.stop(when + 0.22)
  }

  private voiceSnare(ctx: AudioContext, when: number): void {
    if (!this.noise) return
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1900
    bp.Q.value = 0.9
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.5, when)
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.13)
    src.connect(bp).connect(env).connect(this.master!)
    src.start(when, Math.random() * 0.5)
    src.stop(when + 0.15)
  }

  private voiceHat(ctx: AudioContext, when: number): void {
    if (!this.noise) return
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 6800
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.16, when)
    env.gain.exponentialRampToValueAtTime(0.001, when + 0.045)
    src.connect(hp).connect(env).connect(this.master!)
    src.start(when, Math.random() * 0.5)
    src.stop(when + 0.06)
  }

  private voicePad(ctx: AudioContext, when: number, freq: number, dur: number): void {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(0.09, when + Math.min(0.5, dur * 0.3))
    g.gain.linearRampToValueAtTime(0.07, when + dur * 0.75)
    g.gain.linearRampToValueAtTime(0, when + dur)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(950, when)
    // 两个失谐锯齿波制造柔和合唱感
    for (const det of [-6, 6]) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, when)
      osc.detune.setValueAtTime(det, when)
      osc.connect(lp)
      osc.start(when)
      osc.stop(when + dur + 0.1)
    }
    lp.connect(g).connect(this.master!)
  }
}

export const audio = new AudioEngine()
