/**
 * 节奏奶蛙 · 程序化美术
 * 所有角色/物件都用 Phaser Graphics 生成纹理，零图片资源。
 */
import Phaser from 'phaser'

export interface FrogColors {
  skin: number
  skinDark: number
  belly: number
  cheek: number
}

const drawFrog = (gfx: Phaser.GameObjects.Graphics, c: FrogColors, mouthOpen: number): void => {
  const cx = 60
  const cy = 62
  // 身体
  gfx.fillStyle(c.skinDark, 1)
  gfx.fillEllipse(cx, cy + 18, 88, 66)
  gfx.fillStyle(c.skin, 1)
  gfx.fillEllipse(cx, cy, 96, 84)
  // 肚皮
  gfx.fillStyle(c.belly, 1)
  gfx.fillEllipse(cx, cy + 30, 56, 44)
  // 眼睛
  for (const ex of [cx - 26, cx + 26]) {
    gfx.fillStyle(0xffffff, 1)
    gfx.fillCircle(ex, cy - 22, 17)
    gfx.fillStyle(0x2a2333, 1)
    gfx.fillCircle(ex + 3, cy - 20, 8)
    gfx.fillStyle(0xffffff, 1)
    gfx.fillCircle(ex + 5, cy - 23, 2.5)
  }
  // 腮红
  gfx.fillStyle(c.cheek, 0.75)
  for (const chx of [cx - 34, cx + 34]) gfx.fillCircle(chx, cy + 6, 8)
  // 嘴：mouthOpen 0=微笑闭合 1=张大
  if (mouthOpen <= 0.1) {
    gfx.lineStyle(3.5, 0x2a2333, 1)
    gfx.beginPath()
    gfx.arc(cx, cy + 8, 13, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155), false)
    gfx.strokePath()
  } else {
    gfx.fillStyle(0x2a2333, 1)
    gfx.fillEllipse(cx, cy + 16, 20 + mouthOpen * 22, 8 + mouthOpen * 20)
    gfx.fillStyle(0xe0607e, 1)
    gfx.fillEllipse(cx, cy + 22, 10 + mouthOpen * 24, 4 + mouthOpen * 14)
  }
  // 头顶呆毛
  gfx.lineStyle(3, c.skinDark, 1)
  gfx.beginPath()
  gfx.moveTo(cx + 4, cy - 40)
  gfx.lineTo(cx + 12, cy - 52)
  gfx.strokePath()
  gfx.fillStyle(c.skin, 1)
  gfx.fillCircle(cx + 13, cy - 54, 5)
}

export interface LevelPalette {
  sky1: number
  sky2: number
  water: number
  pad: number
  accent: number
}

/** 在场景中注册全部共享纹理；返回关卡配色表集合 */
export function ensureTextures(scene: Phaser.Scene): void {
  const frogColors: FrogColors = { skin: 0x74d17a, skinDark: 0x4faa5c, belly: 0xfff6da, cheek: 0xf8a3b8 }
  const mkFrog = (key: string, open: number) => {
    const gfx = scene.make.graphics({ x: 0, y: 0 }, false)
    drawFrog(gfx, frogColors, open)
    gfx.generateTexture(key, 120, 110)
    gfx.destroy()
  }
  mkFrog('frogIdle', 0)
  mkFrog('frogOpen', 1)

  // 荷叶（带缺口）
  const pad = scene.make.graphics({ x: 0, y: 0 }, false)
  pad.fillStyle(0x3f9e63, 1)
  pad.beginPath()
  pad.arc(70, 70, 66, Phaser.Math.DegToRad(15), Phaser.Math.DegToRad(360), false)
  pad.lineTo(70, 70)
  pad.closePath()
  pad.fillPath()
  pad.fillStyle(0x57b978, 1)
  pad.beginPath()
  pad.arc(70, 66, 56, Phaser.Math.DegToRad(18), Phaser.Math.DegToRad(358), false)
  pad.lineTo(70, 66)
  pad.closePath()
  pad.fillPath()
  pad.generateTexture('pad', 140, 140)
  pad.destroy()

  // 音符豆（tap 模式判定物）
  const note = scene.make.graphics({ x: 0, y: 0 }, false)
  note.fillStyle(0xffffff, 1)
  note.fillCircle(19, 19, 15)
  note.fillStyle(0xf9c74f, 1)
  note.fillCircle(19, 19, 11)
  note.fillStyle(0xffffff, 0.85)
  note.fillCircle(13, 14, 4)
  note.generateTexture('noteBean', 38, 38)
  note.destroy()

  // 四轨键位座
  const key = scene.make.graphics({ x: 0, y: 0 }, false)
  key.fillStyle(0xffffff, 1)
  key.fillRoundedRect(4, 4, 112, 112, 26)
  key.generateTexture('keyPad', 120, 120)
  key.destroy()

  // 进度条底/顶
  const bar = scene.make.graphics({ x: 0, y: 0 }, false)
  bar.fillStyle(0xffffff, 0.22)
  bar.fillRoundedRect(0, 0, 400, 12, 6)
  bar.generateTexture('barBg', 400, 12)
  bar.destroy()
}

export const LANE_COLORS = [0xff6b8d, 0x4cc9f0, 0xffd166, 0x9d66f5]

/** 顶部到顶部的渐变背景（用 tileData 画） */
export function drawBackground(scene: Phaser.Scene, sky1: number, sky2: number, water: number): void {
  const g = scene.add.graphics().setDepth(-10)
  const W = scene.game.config.width as number
  const H = scene.game.config.height as number
  // 40 段渐变，避免可见条带
  const steps = 40
  const c1 = Phaser.Display.Color.IntegerToColor(sky1)
  const c2 = Phaser.Display.Color.IntegerToColor(sky2)
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps
    const col = Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 1000, Math.round(ratio * 1000))
    g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1)
    g.fillRect(0, (H / steps) * i, W, H / steps + 1)
  }
  // 底部水面
  g.fillStyle(water, 1)
  g.fillRect(0, H * 0.78, W, H * 0.22)
  g.fillStyle(0xffffff, 0.06)
  for (let i = 0; i < 5; i++) g.fillRect(20 + i * 105, H * 0.8 + (i % 2) * 22, 70, 3)
}

/** 通用按钮纹理 */
export function buttonBg(scene: Phaser.Scene, key: string, w: number, h: number, color: number): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  g.fillStyle(color, 1)
  g.fillRoundedRect(0, 0, w, h, h / 2)
  g.generateTexture(key, w, h)
  g.destroy()
}
