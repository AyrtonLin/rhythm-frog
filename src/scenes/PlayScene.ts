/**
 * 节奏奶蛙 · 游玩场景
 * 三种玩法在同一个场景内实现，由 level.mode 决定：
 *  - tap   单键点触：音符向奶蛙漂来，点一下接住
 *  - lanes 四轨下落：音符落入荷叶前点对应轨道
 *  - echo  回声接龙：先听奶蛙示范，再在荷叶上复现
 * 所有判定以 AudioContext 时钟为准（audio.now() - 歌曲起点），与音乐严格同步。
 */
import Phaser from 'phaser'
import { audio } from '../core/audio'
import { buildSongSpec } from '../core/music'
import { buildEchoRounds, buildLaneChart, buildTapChart, type ChartNote, type EchoRound } from '../core/chart'
import { drawBackground } from '../game/art'
import { LEVELS, type LevelDef } from '../game/levels'
import { recordResult } from '../core/save'

const GAME_W = 480

const PERFECT_WIN = 0.075
const GOOD_WIN = 0.17
const MISS_AFTER = 0.19

export interface PlayData {
  level: number
}

export interface ResultData {
  level: number
  score: number
  accuracy: number
  stars: number
  good: number
  perfect: number
  miss: number
  maxCombo: number
  success: boolean
}

interface NoteView {
  note: ChartNote
  sprite: Phaser.GameObjects.Image
}

export class PlayScene extends Phaser.Scene {
  private level!: LevelDef
  private startAt = 0
  private endAt = 0
  private finished = false

  private score = 0
  private combo = 0
  private maxCombo = 0
  private perfect = 0
  private good = 0
  private miss = 0

  // ---- HUD
  private scoreText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private progressFill!: Phaser.GameObjects.Rectangle
  private hintText?: Phaser.GameObjects.Text

  // ---- tap 模式
  private tapNotes: ChartNote[] = []
  private tapViews: NoteView[] = []
  private tapCursor = 0
  private frog!: Phaser.GameObjects.Image
  private frogOpenUntil = 0
  private readonly judgeX = 130
  private readonly frogY = 430

  // ---- lanes 模式
  private laneNotes: ChartNote[] = []
  private laneViews: NoteView[] = []
  private laneCursor = 0
  private laneKeys: Phaser.GameObjects.Image[] = []
  private laneGlow = [0, 0, 0, 0]

  // ---- echo 模式
  private rounds: EchoRound[] = []
  private roundIndex = 0
  private phase: 'idle' | 'cue' | 'input' | 'roundEnd' = 'idle'
  private cueIndex = 0
  private inputIndex = 0
  private padImages: Phaser.GameObjects.Image[] = []
  private padFlash: number[] = []
  private roundResults: boolean[] = []

  constructor() {
    super('play')
  }

  create(data: PlayData): void {
    const levelIndex = (data.level ?? 0) as number
    this.level = LEVELS[levelIndex]
    const palette = this.level.palette
    const spec = buildSongSpec(this.level.plan)

    audio.setLead(spec.leadWave, spec.leadGain)
    audio.setBass(spec.bassWave)
    drawBackground(this, palette.sky1, palette.sky2, palette.water)

    const played = audio.playSong(spec)
    this.startAt = played.startAt
    this.endAt = played.endAt
    this.finished = false

    this.score = 0
    this.combo = 0
    this.maxCombo = 0
    this.perfect = 0
    this.good = 0
    this.miss = 0

    // ===== 重置模式状态（scene.start 会复用同一场景实例，字段不会自动清零）=====
    this.tapNotes = []
    this.tapViews = []
    this.tapCursor = 0
    this.frogOpenUntil = 0
    this.laneNotes = []
    this.laneViews = []
    this.laneCursor = 0
    this.laneKeys = []
    this.laneGlow = [0, 0, 0, 0]
    this.rounds = []
    this.roundIndex = 0
    this.phase = 'idle'
    this.cueIndex = 0
    this.inputIndex = 0
    this.padImages = []
    this.padFlash = []
    this.roundResults = []

    // ============ 模式布置 ============
    if (this.level.mode === 'tap') {
      const plan = this.level.plan
      this.tapNotes = buildTapChart(spec, plan)
      // 判定线 & 荷叶上的奶蛙
      const pad = this.add.image(this.judgeX - 10, this.frogY + 66, 'pad').setScale(1.15).setAlpha(0.95)
      pad.setTint(palette.pad)
      this.frog = this.add.image(this.judgeX, this.frogY, 'frogIdle').setScale(1.2).setDepth(5)
      this.add.text(this.judgeX, this.frogY - 92, this.level.name, {
        fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.9)
      this.hintText = this.add
        .text(GAME_W / 2, 250, '音符飘到嘴边时\n点击屏幕！', {
          fontFamily: 'Arial, sans-serif', fontSize: '26px', color: '#ffffff', align: 'center',
          stroke: '#00000055', strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(6)
    } else if (this.level.mode === 'lanes') {
      this.laneNotes = buildLaneChart(spec)
      const judgeY = 620
      for (let i = 0; i < 4; i++) {
        const x = ((i + 0.5) / 4) * GAME_W
        const keyImg = this.add.image(x, judgeY + 90, 'keyPad').setScale(0.92, 0.8)
        keyImg.setTint(Phaser.Display.Color.IntegerToColor([0xff6b8d, 0x4cc9f0, 0xffd166, 0x9d66f5][i]).color).setAlpha(0.9)
        this.laneKeys.push(keyImg)
        this.add.rectangle(x, judgeY, GAME_W / 4 - 8, 6, 0xffffff, 0.55)
      }
      this.hintText = this.add
        .text(GAME_W / 2, 220, '音符落入荷叶前点对应轨道\n（键盘 A S D F）', {
          fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#ffffff', align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(6)
    } else {
      const plan = this.level.plan
      this.rounds = buildEchoRounds(spec, plan)
      this.roundResults = this.rounds.map(() => false)
      this.phase = 'idle'
      this.roundIndex = 0
      // 4 片荷叶按键
      for (let i = 0; i < 4; i++) {
        const x = ((i + 0.5) / 4) * GAME_W
        const pad = this.add.image(x, 650, 'pad').setScale(0.78)
        pad.setTint([0xff9db6, 0x7fd4ff, 0xffe08a, 0xc3a6ff][i]).setAlpha(0.95)
        this.padImages.push(pad)
        this.padFlash.push(0)
      }
      this.frog = this.add.image(GAME_W / 2, 420, 'frogIdle').setScale(1.5).setDepth(5)
      this.hintText = this.add
        .text(GAME_W / 2, 250, '看奶蛙示范\n然后按顺序点荷叶！', {
          fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#ffffff', align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(6)
    }

    // ============ HUD ============
    this.scoreText = this.add
      .text(20, 12, '得分 0', { fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#ffffff' })
      .setDepth(10)
    this.comboText = this.add
      .text(GAME_W / 2, 96, '', {
        fontFamily: 'Arial, sans-serif', fontSize: '30px', color: '#ffd166', stroke: '#00000066', strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10)

    this.add.image(GAME_W / 2, 52, 'barBg').setDepth(10)
    this.progressFill = this.add.rectangle(GAME_W / 2 - 200, 46, 0, 12, 0xffffff, 0.95).setOrigin(0, 0).setDepth(11)

    const exit = this.add
      .text(GAME_W - 20, 20, '✕', { fontFamily: 'Arial, sans-serif', fontSize: '28px', color: '#ffffff' })
      .setOrigin(1, 0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true })
    exit.on('pointerdown', () => {
      audio.stopSong()
      this.scene.start('select')
    })

    // ============ 输入 ============
    this.events.once('shutdown', () => audio.stopSong())
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.resume()
      if (this.finished) return
      if (this.level.mode === 'tap') this.tapHit()
      else if (this.level.mode === 'lanes') this.laneHit(p)
      else this.echoHit(p)
    })
    // 键盘（桌面调试友好）
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.finished) return
      const key = e.key.toUpperCase()
      if (this.level.mode === 'tap' && key === ' ') this.tapHit()
      else if (this.level.mode === 'lanes') {
        const idx = ['A', 'S', 'D', 'F'].indexOf(key)
        if (idx >= 0) this.laneHitAt(idx)
      } else if (this.level.mode === 'echo') {
        const idx = ['A', 'S', 'D', 'F'].indexOf(key)
        if (idx >= 0) this.echoHitAt(idx)
      }
    })
  }

  override update(): void {
    if (this.finished) return
    const t = audio.now() - this.startAt
    this.progressFill.width = Math.max(0, Math.min(400, (t / Math.max(0.001, this.endAt - this.startAt)) * 400))

    switch (this.level.mode) {
      case 'tap':
        this.updateTap(t)
        break
      case 'lanes':
        this.updateLanes(t)
        break
      case 'echo':
        this.updateEcho(t)
        break
    }

    if (t > this.endAt) {
      this.finish()
    }
  }

  // ================================================================ TAP

  private tapSpawn(t: number): void {
    while (this.tapCursor < this.tapNotes.length && this.tapNotes[this.tapCursor].t - t < 1.4) {
      const note = this.tapNotes[this.tapCursor]
      const sprite = this.add
        .image(this.judgeX + (note.t - t) * ((GAME_W - this.judgeX) / 1.4), this.frogY, 'noteBean')
        .setDepth(4)
      sprite.setTint(this.pitchTint(note.pitch))
      this.tapViews.push({ note, sprite })
      this.tapCursor++
    }
  }

  private pitchTint(pitch: number): number {
    const h = ((pitch * 7.77) % 360) | 0
    return Phaser.Display.Color.HSVToRGB(h / 360, 0.45, 1).color as number
  }

  private updateTap(t: number): void {
    this.tapSpawn(t)
    // 移动 & 超时判 miss
    for (let i = this.tapViews.length - 1; i >= 0; i--) {
      const v = this.tapViews[i]
      if (v.note.result === 'none') {
        v.sprite.x = this.judgeX + (v.note.t - t) * ((GAME_W - this.judgeX) / 1.4)
        if (t > v.note.t + MISS_AFTER) {
          v.note.result = 'miss'
          this.miss++
          this.combo = 0
          this.flashJudge(v.sprite.x, this.frogY, 'MISS', '#9aa0b5')
          this.tweens.add({ targets: v.sprite, alpha: 0, y: v.sprite.y + 40, duration: 260, onComplete: () => v.sprite.destroy() })
          this.tapViews.splice(i, 1)
          continue
        }
      }
    }

    // 奶蛙张嘴计时恢复
    if (this.frogOpenUntil > 0 && performance.now() > this.frogOpenUntil && this.frog) {
      this.frog.setTexture('frogIdle')
      this.frogOpenUntil = 0
    }
  }

  private tapHit(): void {
    const t = audio.now() - this.startAt
    // 找最近的未命中音符
    let best: NoteView | null = null
    let bestDt = 999
    for (const v of this.tapViews) {
      if (v.note.result !== 'none') continue
      const dt = Math.abs(v.note.t - t)
      if (dt < bestDt) {
        bestDt = dt
        best = v
      }
    }
    this.openFrog()
    if (best && bestDt <= GOOD_WIN) {
      const isPerfect = bestDt <= PERFECT_WIN
      best.note.result = isPerfect ? 'perfect' : 'good'
      best.note.hit = true
      this.hitScore(isPerfect)
      this.flashJudge(this.judgeX, this.frogY - 70, isPerfect ? 'PERFECT!' : 'GOOD', isPerfect ? '#ffd166' : '#7ee8fa')
      audio.hitFx(isPerfect ? 'perfect' : 'miss')
      // 音符被吃掉
      this.tweens.add({
        targets: best.sprite,
        x: this.judgeX - 10,
        y: this.frogY - 20,
        scale: 0.3,
        alpha: 0,
        duration: 140,
        onComplete: () => best!.sprite.destroy(),
      })
      this.tapViews = this.tapViews.filter((v) => v !== best)
    } else {
      // 空拍：轻惩罚
      this.combo = 0
      this.comboText.setText('')
      this.flashJudge(GAME_W / 2, 300, '空拍…', '#ffb4c2')
      this.cameras.main.shake(60, 0.002)
    }
  }

  private openFrog(): void {
    if (!this.frog || this.level.mode !== 'tap') return
    if (this.frogOpenUntil === 0) this.frog.setTexture('frogOpen')
    this.frogOpenUntil = performance.now() + 130
  }

  // ================================================================ LANES

  private updateLanes(t: number): void {
    const judgeY = 620
    while (this.laneCursor < this.laneNotes.length && this.laneNotes[this.laneCursor].t - t < 1.15) {
      const note = this.laneNotes[this.laneCursor]
      const x = ((note.lane + 0.5) / 4) * GAME_W
      const sprite = this.add.image(x, -30, 'noteBean').setDepth(4).setScale(0.92)
      sprite.setTint(Phaser.Display.Color.IntegerToColor([0xff6b8d, 0x4cc9f0, 0xffd166, 0x9d66f5][note.lane]).color)
      this.laneViews.push({ note, sprite })
      this.laneCursor++
    }

    const speed = (judgeY + 50) / 1.15
    for (let i = this.laneViews.length - 1; i >= 0; i--) {
      const v = this.laneViews[i]
      if (v.note.result === 'none') {
        v.sprite.y = judgeY - (v.note.t - t) * speed
        if (t > v.note.t + MISS_AFTER) {
          v.note.result = 'miss'
          this.miss++
          this.combo = 0
          this.flashJudge(v.sprite.x, judgeY + 40, 'MISS', '#9aa0b5')
          this.tweens.add({ targets: v.sprite, alpha: 0, duration: 200, onComplete: () => v.sprite.destroy() })
          this.laneViews.splice(i, 1)
        }
      }
    }

    // 键位呼吸
    for (let i = 0; i < 4; i++) {
      if (this.laneGlow[i] >= 1) {
        this.laneGlow[i] = 0
        this.laneKeys[i].setScale(0.92, 0.8)
      }
    }
  }

  private laneHit(p: Phaser.Input.Pointer): void {
    const lane = Math.max(0, Math.min(3, Math.floor((p.x / GAME_W) * 4)))
    this.laneHitAt(lane)
  }

  private laneHitAt(lane: number): void {
    const t = audio.now() - this.startAt
    const judgeY = 620
    this.laneGlow[lane] = 0.999
    this.time.delayedCall(120, () => (this.laneGlow[lane] = 0))

    let best: NoteView | null = null
    let bestDt = 999
    for (const v of this.laneViews) {
      if (v.note.result !== 'none' || v.note.lane !== lane) continue
      const dt = Math.abs(v.note.t - t)
      if (dt < bestDt) {
        bestDt = dt
        best = v
      }
    }

    this.tweens.add({ targets: this.laneKeys[lane], scaleX: 0.98, duration: 70, yoyo: true })

    if (best && bestDt <= GOOD_WIN) {
      const isPerfect = bestDt <= PERFECT_WIN
      best.note.result = isPerfect ? 'perfect' : 'good'
      this.hitScore(isPerfect)
      this.flashJudge(best.sprite.x, judgeY - 60, isPerfect ? 'PERFECT!' : 'GOOD', isPerfect ? '#ffd166' : '#7ee8fa')
      audio.hitFx(isPerfect ? 'perfect' : 'miss')
      this.tweens.add({
        targets: best.sprite,
        scale: 1.5,
        alpha: 0,
        duration: 170,
        onComplete: () => best!.sprite.destroy(),
      })
      this.laneViews = this.laneViews.filter((v) => v !== best)
    } else {
      this.combo = 0
      this.comboText.setText('')
      this.flashJudge(GAME_W / 2, 300, '空拍…', '#ffb4c2')
    }
  }

  // ================================================================ ECHO

  private updateEcho(t: number): void {
    const round = this.rounds[this.roundIndex]
    if (!round) {
      this.finish()
      return
    }

    if (this.phase === 'idle' && t >= round.start - 1.6) {
      this.phase = 'cue'
      this.cueIndex = 0
      this.hintText?.setText('听——奶蛙在示范…\n轮到你时点对应荷叶')
      this.flashRound(this.roundIndex + 1, this.rounds.length)
    }

    if (this.phase === 'cue') {
      // 触发音块（随音频时钟校准）
      while (this.cueIndex < round.tones.length && t >= round.tones[this.cueIndex].t) {
        const tone = round.tones[this.cueIndex]
        audio.tone(this.padTone(tone.pad), 0.34, 'triangle', 0.4)
        this.glowPad(tone.pad)
        if (this.frog) {
          this.frog.setTexture('frogOpen')
          this.time.delayedCall(160, () => this.frog?.setTexture('frogIdle'))
        }
        this.cueIndex++
      }
      if (this.cueIndex >= round.tones.length && t >= round.tones[round.tones.length - 1].t + 0.55) {
        this.phase = 'input'
        this.inputIndex = 0
        this.hintText?.setText('轮到你啦！按顺序点荷叶')
      }
    }

    if (this.phase === 'input' && t >= round.inputEnd) {
      // 没按完 = 本轮失败
      this.roundDone(false)
    }

    // 荷叶闪光衰减
    for (let i = 0; i < 4; i++) {
      if (this.padFlash[i] > 0) {
        this.padFlash[i] = Math.max(0, this.padFlash[i] * 0.9)
        this.padImages[i].setScale(0.78 + this.padFlash[i] * 0.14)
      }
    }
  }

  private echoHit(p: Phaser.Input.Pointer): void {
    this.echoHitAt(Math.max(0, Math.min(3, Math.floor((p.x / GAME_W) * 4))))
  }

  private echoHitAt(pad: number): void {
    this.glowPad(pad)
    audio.tone(this.padTone(pad), 0.3, 'triangle', 0.4)
    if (this.phase !== 'input') {
      // 还在示范阶段就乱点：不惩罚，只响应声音
      return
    }
    const round = this.rounds[this.roundIndex]
    if (!round) return
    if (round.tones[this.inputIndex].pad === pad) {
      this.inputIndex++
      this.score += 40
      this.scoreText.setText(`得分 ${this.score}`)
      if (this.inputIndex >= round.tones.length) {
        this.roundDone(true)
      }
    } else {
      this.flashJudge(GAME_W / 2, 400, '顺序错了！', '#ffb4c2')
      audio.hitFx('miss')
      this.roundDone(false)
    }
  }

  private roundDone(success: boolean): void {
    const round = this.rounds[this.roundIndex]
    if (!round) return
    this.roundResults[this.roundIndex] = success
    this.phase = 'roundEnd'
    if (success) {
      this.perfect++
      this.score += 120
      this.combo++
      this.maxCombo = Math.max(this.maxCombo, this.combo)
      this.flashJudge(GAME_W / 2, 400, `完美复现！${this.roundIndex + 1}/${this.rounds.length}`, '#ffd166')
      if (this.frog) {
        this.tweens.add({ targets: this.frog, y: 400, scale: 1.62, duration: 180, yoyo: true, ease: 'Quad.easeOut' })
      }
      audio.hitFx('perfect')
    } else {
      this.miss++
      this.combo = 0
      this.flashJudge(GAME_W / 2, 400, `差一点点…${this.roundIndex + 1}/${this.rounds.length}`, '#ffb4c2')
    }
    this.scoreText.setText(`得分 ${this.score}`)
    this.roundIndex++
    if (this.roundIndex >= this.rounds.length) {
      this.time.delayedCall(700, () => this.finish())
    } else {
      this.time.delayedCall(600, () => (this.phase = 'idle'))
    }
  }

  private flashRound(cur: number, total: number): void {
    this.flashJudge(GAME_W / 2, 330, `第 ${cur} / ${total} 轮`, '#9be7ff')
  }

  private padTone(pad: number): number {
    // 四个荷叶对应 C E G 高八度C
    const semis = [0, 4, 7, 12][pad]
    return 440 * Math.pow(2, (this.level.plan.key + semis + 12 - 69) / 12)
  }

  private glowPad(pad: number): void {
    this.padFlash[pad] = 1
    this.tweens.add({ targets: this.padImages[pad], angle: { from: -5, to: 5 }, duration: 120, yoyo: true })
  }

  // ================================================================ 通用

  private hitScore(isPerfect: boolean): void {
    this.combo++
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    if (isPerfect) this.perfect++
    else this.good++
    const comboBonus = 1 + Math.min(this.combo, 30) * 0.05
    this.score += Math.round((isPerfect ? 100 : 45) * comboBonus)
    this.scoreText.setText(`得分 ${this.score}`)
    this.comboText.setText(this.combo >= 2 ? `${this.combo} 连击!` : '')
    this.tweens.add({ targets: this.comboText, scale: 1.25, duration: 90, yoyo: true })
  }

  private flashJudge(x: number, y: number, text: string, color: string): void {
    const txt = this.add
      .text(x, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '30px',
        color,
        stroke: '#00000055',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10)
    this.tweens.add({
      targets: txt,
      y: y - 44,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => txt.destroy(),
    })
  }

  private finish(): void {
    if (this.finished) return
    this.finished = true
    audio.stopSong()

    const accuracy =
      this.level.mode === 'echo'
        ? this.perfect / Math.max(1, this.rounds.length)
        : (this.perfect + this.good * 0.5) / Math.max(1, this.perfect + this.good + this.miss)
    const stars = accuracy >= 0.85 ? 3 : accuracy >= 0.68 ? 2 : accuracy >= 0.5 ? 1 : 0
    const result: ResultData = {
      level: this.level.index,
      score: this.score,
      accuracy,
      stars,
      good: this.good,
      perfect: this.perfect,
      miss: this.miss,
      maxCombo: this.maxCombo,
      success: stars > 0,
    }
    recordResult(this.level.index, this.score, stars)
    this.scene.start('result', result)
  }
}
