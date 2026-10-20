/**
 * 节奏奶蛙 · 关卡定义
 * 每关 = 一种玩法模式 + 一首风格化代码音乐 + 配色。
 */
import type { SongPlan } from '../core/music'
import { SONG_PLANS } from '../core/music'
import type { LevelPalette } from './art'

const [PLAN_DEWPOND, PLAN_BUBBLEPOP, PLAN_ECHO, PLAN_FASTLANE, PLAN_BOSSWAVE] = SONG_PLANS

export type GameMode = 'tap' | 'lanes' | 'echo'

export interface LevelDef {
  index: number
  name: string
  subtitle: string
  mode: GameMode
  modeLabel: string
  plan: SongPlan
  palette: LevelPalette
}

export const LEVELS: LevelDef[] = [
  {
    index: 0,
    name: '晨露小塘',
    subtitle: '奶蛙的第一堂打拍课',
    mode: 'tap',
    modeLabel: '音符飘到奶蛙嘴边时点一下屏幕',
    plan: PLAN_DEWPOND,
    palette: { sky1: 0xffe5ec, sky2: 0xffc7d6, water: 0x8fd8c2, pad: 0x57b978, accent: 0xf26d85 },
  },
  {
    index: 1,
    name: '泡泡狂欢节',
    subtitle: '盛夏水乡的欢快合唱',
    mode: 'lanes',
    modeLabel: '音符豆落入荷叶前，雪花点点亮起时点下对应轨道',
    plan: PLAN_BUBBLEPOP,
    palette: { sky1: 0xffd166, sky2: 0xff9f68, water: 0x2ec4b6, pad: 0x2a9d8f, accent: 0xe76f51 },
  },
  {
    index: 2,
    name: '回声荷塘',
    subtitle: '夜里的蛙声合唱团',
    mode: 'echo',
    modeLabel: '听听奶蛙唱了哪片荷叶，一个不少地复现',
    plan: PLAN_ECHO,
    palette: { sky1: 0x2b3a67, sky2: 0x1d2d50, water: 0x22608c, pad: 0x2d8f8f, accent: 0x7ee8fa },
  },
  {
    index: 3,
    name: '荷叶滑滑梯',
    subtitle: '四轨快闪，手速与乐感齐飞',
    mode: 'lanes',
    modeLabel: '音符豆落入荷叶前点下对应轨道',
    plan: PLAN_FASTLANE,
    palette: { sky1: 0x8f65ff, sky2: 0x5f4bb6, water: 0x2f2465, pad: 0x4cc9f0, accent: 0xffd166 },
  },
  {
    index: 4,
    name: '蛙王登擂台',
    subtitle: '众蛙之上，唯我奶蛙',
    mode: 'tap',
    modeLabel: 'BPM 144 的终局考验',
    plan: PLAN_BOSSWAVE,
    palette: { sky1: 0x241503, sky2: 0x4a1e05, water: 0x7a2e0f, pad: 0xd06f1f, accent: 0xffe066 },
  },
]
