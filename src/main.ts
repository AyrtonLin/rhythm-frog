import Phaser from 'phaser'
import './style.css'
import { audio } from './core/audio'
import { TitleScene } from './scenes/TitleScene'
import { SelectScene } from './scenes/SelectScene'
import { PlayScene } from './scenes/PlayScene'
import { ResultScene } from './scenes/ResultScene'

const GAME_W = 480
const GAME_H = 800

/**
 * 《节奏奶蛙》H5 休闲节奏游戏
 * 关卡型节奏玩法合集：单键点触 / 四轨下落 / 回声接龙
 * 音乐全部由 Web Audio 程序化合成，谱面与音符同源，音画严格同步
 */
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'app',
  backgroundColor: '#ffe5ec',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, SelectScene, PlayScene, ResultScene],
})

// 调试句柄：挂在 canvas 上（隔离执行环境也能拿到 DOM 属性）
const stash = () => {
  const canvas = document.querySelector('canvas')
  if (canvas) (canvas as unknown as { __rf?: unknown }).__rf = { game, audio: audio }
  else setTimeout(stash, 200)
}
stash()
// 备份：控制台也可透过 window 存取
;(window as unknown as { __rf?: unknown }).__rf = { game, audio: audio }
