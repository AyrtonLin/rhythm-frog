/**
 * 节奏奶蛙 · 选关页
 */
import Phaser from 'phaser'
import { audio } from '../core/audio'
import { getBest, isUnlocked } from '../core/save'
import { LEVELS } from '../game/levels'

const GAME_W = 480
const GAME_H = 800

const MODE_TAG: Record<string, string> = {
  tap: '点触',
  lanes: '四轨',
  echo: '接龙',
}

export class SelectScene extends Phaser.Scene {
  constructor() {
    super('select')
  }

  create(): void {
    const colors = LEVELS.map((l) => l.palette)

    this.add
      .text(GAME_W / 2, 74, '♪ 选择关卡 ♪', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        stroke: '#f26d85',
        strokeThickness: 7,
      })
      .setOrigin(0.5)

    const back = this.add
      .text(30, 70, '‹ 首页', { fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#ffffff' })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
    back.on('pointerdown', () => this.scene.start('title'))

    LEVELS.forEach((level, i) => {
      const y = 170 + i * 118
      const unlocked = isUnlocked(level.index)
      const best = getBest(level.index)
      const c = colors[i]

      const lockedBy = unlocked ? null : LEVELS[level.index - 1]
      const card = this.add.container(GAME_W / 2, y)
      // 已解锁用深色底（water）保证白字可读；未解锁用灰
      const bg = this.add.rectangle(0, 0, 420, 100, unlocked ? Phaser.Display.Color.IntegerToRGB(c.water).color : 0x8a8fa3, unlocked ? 1 : 0.55)
      bg.setStrokeStyle(3, unlocked ? Phaser.Display.Color.IntegerToRGB(c.accent).color : 0x9a9db0)
      card.add(bg)

      const title = this.add
        .text(-190, -24, `${level.index + 1}. ${level.name}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '26px',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5)
      card.add(title)

      card.add(
        this.add
          .text(-190, 12, lockedBy ? `通关上一关「${lockedBy.name}」后解锁` : level.subtitle, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '17px',
            color: unlocked ? '#f4fffb' : '#e4e5ec',
          })
          .setOrigin(0, 0.5),
      )

      const stars = best?.stars ?? 0
      const modeLabel = lockedBy ? '未解锁' : `${MODE_TAG[level.mode]} · BPM ${level.plan.bpm}`
      card.add(
        this.add
          .text(190, -24, modeLabel, { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: unlocked ? '#fff2b0' : '#e0e1e8' })
          .setOrigin(1, 0.5),
      )

      // 星级
      card.add(
        this.add
          .text(190, 12, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${best ? ` ${best.score}` : ''}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: unlocked ? '#fff2b0' : '#e0e1e8',
          })
          .setOrigin(1, 0.5),
      )

      if (unlocked) {
        bg.setInteractive({ useHandCursor: true })
        bg.on('pointerover', () => bg.fillColor = Phaser.Display.Color.IntegerToRGB(c.accent).color)
        bg.on('pointerout', () => bg.fillColor = Phaser.Display.Color.IntegerToRGB(c.water).color)
        bg.on('pointerdown', () => {
          audio.tone(520, 0.1, 'triangle', 0.25)
          this.scene.start('play', { level: level.index })
        })
      }
    })

    this.add
      .text(GAME_W / 2, GAME_H - 24, '分数与星星保存在这台设备上', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#a88fa0',
      })
      .setOrigin(0.5)
  }
}
