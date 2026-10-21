/**
 * 节奏奶蛙 · 标题页
 */
import Phaser from 'phaser'
import { audio } from '../core/audio'
import { ensureTextures } from '../game/art'

const GAME_W = 480
const GAME_H = 800

/** 游戏版本号：每次发布修复递增，方便确认线上/本地跑的是哪版 */
export const GAME_VERSION = 'v1.2'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title')
  }

  create(): void {
    ensureTextures(this)
    this.cameras.main.setBackgroundColor('#ffe5ec')

    // 装饰气泡
    for (let i = 0; i < 14; i++) {
      const dot = this.add
        .circle(Phaser.Math.Between(20, GAME_W - 20), Phaser.Math.Between(60, GAME_H - 60), Phaser.Math.Between(3, 9), 0xffffff, 0.28)
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(20, 60),
        alpha: 0.08,
        duration: Phaser.Math.Between(2200, 4200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1200),
      })
    }

    this.add
      .text(GAME_W / 2, 210, '节奏奶蛙', {
        fontFamily: 'Arial, "Microsoft YaHei", sans-serif',
        fontSize: '76px',
        color: '#f26d85',
        stroke: '#ffffff',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setName('logo')

    this.add
      .text(GAME_W / 2, 282, 'RHYTHM MILK FROG · H5 休闲节奏游戏', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#a05a68',
      })
      .setOrigin(0.5)

    const pads = [
      { x: GAME_W / 2 - 120, y: 420, s: 0.9 },
      { x: GAME_W / 2 + 110, y: 400, s: 0.75 },
    ]
    for (const p of pads) {
      const pad = this.add.image(p.x, p.y + 28, 'pad').setScale(p.s).setAlpha(0.9)
      this.tweens.add({ targets: pad, scale: p.s * 1.03, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    const frog = this.add.image(GAME_W / 2, 420, 'frogIdle').setScale(1.35)
    this.tweens.add({ targets: frog, scaleX: 1.45, scaleY: 1.28, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const start = this.add
      .text(GAME_W / 2, 620, '▶ 触摸开始', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        color: '#ffffff',
        backgroundColor: '#f26d85',
        padding: { x: 34, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    this.tweens.add({ targets: start, scale: 1.06, duration: 640, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    this.add
      .text(GAME_W / 2, 730, `支持触屏与键盘 · 建议佩戴耳机 · ${GAME_VERSION}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#b37580',
      })
      .setOrigin(0.5)

    let navigating = false
    const go = () => {
      if (navigating) return
      navigating = true
      audio.ensure()
      audio.resume()
      audio.tone(660, 0.12, 'triangle', 0.25)
      this.scene.start('select')
    }
    start.on('pointerdown', go)
    this.input.on('pointerdown', go)
  }
}
