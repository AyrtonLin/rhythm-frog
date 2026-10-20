# 节奏奶蛙 · Rhythm Milk Frog

H5 休闲节奏游戏：帮奶蛙跟着节拍吃音符！五个关卡、三种玩法，全部音乐与美术由代码生成。

## 玩法

| 关卡 | 玩法 | 音乐 |
| --- | --- | --- |
| 晨露小塘 | 单键点触 | 84 BPM 田园 chill |
| 泡泡狂欢节 | 四轨下落 | 112 BPM 泡泡流行 |
| 回声荷塘 | 记忆接龙 | 100 BPM 夜曲氛围 |
| 荷叶滑滑梯 | 四轨进阶 | 128 BPM 芯片电音 |
| 蛙王登擂台 | 点触终极 | 144 BPM EDM |

- **点触**：音符漂到奶蛙嘴边时点屏幕（桌面可用空格）
- **四轨**：音符落到判定线前点对应轨道（键盘 A S D F）
- **接龙**：听奶蛙示范，按顺序复现荷叶音序

判定 PERFECT / GOOD / MISS，连击加分，通关拿星解锁下一关，进度存在本地。

## 技术

- Phaser 4 + TypeScript + Vite
- Web Audio 程序化合成全部音乐（零音频资源），谱面与音符同源，AudioContext 时钟驱动判定，音画严格同步
- 所有角色 / 场景用 Graphics 程序化绘制（零图片资源）

## 开发

```bash
npm install
npm run dev      # 开发
npm run build    # 构建产物在 dist/
npm run preview  # 本地预览构建
```

推送到 `main` 分支会自动构建并发布到 GitHub Pages。
