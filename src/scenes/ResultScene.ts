/**
 * 节奏奶蛙 · 结算页
 */
import Phaser from 'phaser'
import { audio } from '../core/audio'
import { getBest, isUnlocked, recordResult } from '../core/save'
import { LEVELS } from '../game/levels'
import { buttonBg } from '../game/art'
import type { ResultData } from './PlayScene'

const GAME_W = 480

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result')
  }

  create(data: ResultData): void {
    const level = LEVELS[data.level] ?? LEVELS[0]
    this.cameras.main.setBackgroundColor('#22223b')

    // 结果数据兜底再记录一次（防呆）
    recordResult(data.level, data.score, data.stars)
    const best = getBest(data.level)

    this.add
      .text(GAME_W / 2, 110, data.success ? '奶蛙大成功！' : '再练一练嘛…', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '46px',
        color: data.success ? '#ffd166' : '#b8c0ff',
        stroke: '#00000055',
        strokeThickness: 5,
      })
      .setOrigin(0.5)

    const frog = this.add.image(GAME_W / 2, 250 + (data.success ? 0 : 10), 'frogIdle').setScale(data.success ? 1.5 : 1.25)
    if (data.success) {
      this.tweens.add({
        targets: frog,
        y: '-=18',
        duration: 480,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }

    // 星星
    for (let i = 0; i < 3; i++) {
      const earned = i < data.stars
      const star = this.add.text(GAME_W / 2 + (i - 1) * 70, 360, earned ? '★' : '☆', {
        fontFamily: 'Arial, sans-serif', fontSize: '58px', color: earned ? '#ffd166' : '#5d5f77',
      }).setOrigin(0.5)
      if (earned) {
        star.setScale(0).setAngle(-30)
        this.tweens.add({ targets: star, scale: 1, angle: 0, duration: 320, ease: 'Back.easeOut', delay: 260 + i * 180 })
      }
    }

    this.add
      .text(GAME_W / 2, 440, `${level.name} · 得分 ${data.score}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    const accuracyPct = Math.round(data.accuracy * 100)
    this.add
      .text(
        GAME_W / 2,
        490,
        level.mode === 'echo'
          ? `复现成功 ${data.perfect}/${data.perfect + data.miss} 轮 · 命中率 ${accuracyPct}%`
          : `PERFECT ${data.perfect} · GOOD ${data.good} · MISS ${data.miss}\n最大连击 ${data.maxCombo} · 准确率 ${accuracyPct}%`,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          color: '#c9d2ff',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5)

    if (best && best.score >= data.score) {
      this.add
        .text(GAME_W / 2, 550, `历史最佳 ${best.score}`, { fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#9fb2c8' })
        .setOrigin(0.5)
    } else if (best) {
      this.add
        .text(GAME_W / 2, 550, '🏆 新纪录！', { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffd166' })
        .setOrigin(0.5)
    }

    // 按钮
    const mkButton = (y: number, label: string, color: number, cb: () => void): void => {
      buttonBg(this, `btn-${y}-${label.length}`, 220, 54, color)
      const btn = this.add
        .image(GAME_W / 2, y, `btn-${y}-${label.length}`)
        .setInteractive({ useHandCursor: true })
      const label2 = this.add
        .text(GAME_W / 2, y, label, { fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#ffffff' })
        .setOrigin(0.5)
      btn.setDepth(2)
      label2.setDepth(3)
      btn.on('pointerover', () => btn.setScale(1.04))
      btn.on('pointerout', () => btn.setScale(1))
      btn.on('pointerdown', cb)
    }

    const hasNext = data.level + 1 < LEVELS.length && isUnlocked(data.level + 1)
    const unlockedNext = data.stars > 0 && data.level + 1 < LEVELS.length

    mkButton(630, '再来一次', 0x4cc9f0, () => this.scene.start('play', { level: data.level }))
    if (hasNext || unlockedNext) {
      mkButton(700, '下一关 ▶', 0xf26d85, () => this.scene.start('play', { level: data.level + 1 }))
      mkButton(764, '回选关', 0x747a99, () => this.scene.start('select'))
    } else {
      mkButton(700, '回选关', 0x747a99, () => this.scene.start('select'))
    }

    // 点击音效
    this.input.on('pointerdown', () => {
      audio.ensure()
      audio.resume()
    })
  }
}
