# 咒术回战 · 咒术激斗 (jjk-fighter)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)

基于《咒术回战》的同人 2D 格斗游戏。**纯 Canvas + Web Audio 实现，前端零框架零构建**；附带 Tauri 2 桌面壳（Rust）与帧锁同步联机服务器（Node.js）。

> [!IMPORTANT]
> 本项目为非商业同人作品（fan game），与集英社、MAPPA 及原作版权方无关。游戏本体不含任何版权音频，请阅读[音频资源说明](public/audio/README.md)。仅供学习交流，请支持正版。

## ✨ 特性

- **28 名可选角色** —— 五条悟、虎杖悠仁、伏黑惠、两面包由、宿傩、乙骨忧太、七海建人、羂索等，含觉醒/受肉形态
- **4 种游戏模式** —— 双人同屏对战 / 街机闯关（连战十人）/ AI 对决 / 局域网联机 1v1
- **帧锁同步（Lockstep）联机** —— 输入帧转发 + 同步校验 + RTT 采样平滑，服务端带 schema 校验、限速、连接配额、房号状态机等加固
- **原作机制还原** —— 黑闪（暴击 2.5 次方威力 + 回血）、领域展开、必杀技顿帧、BO3 赛制
- **可重绑按键** —— 双人键位均可在设置界面自定义
- **桌面版** —— Tauri 2 打包为 Windows 安装包（NSIS），前端与网页版完全一致

## 📁 目录结构

```
jjk-fighter/
├── public/                  # 游戏前端（既是网页版本体，也是 Tauri 的 frontendDist）
│   ├── index.html
│   ├── css/                 # 界面样式
│   ├── js/                  # 游戏核心（ES Modules）
│   │   ├── main.js          # 入口：Canvas 初始化 + 主循环
│   │   ├── config.js        # 全局常量、角色数据、默认键位
│   │   ├── game.js          # 对局状态机与流程控制
│   │   ├── entities/        # 战斗实体（格斗核心/必杀/判定）
│   │   ├── render/          # 渲染层（背景/HUD/选人/立绘）
│   │   ├── audio.js         # Web Audio：合成音轨 + OGG 文件曲目
│   │   ├── net.js           # 联机客户端（帧锁同步）
│   │   └── ...
│   ├── server/              # 联机中转服务器（Node.js + ws）
│   │   ├── net-server.mjs
│   │   └── test/            # 协议单元测试
│   └── audio/               # 背景音乐占位（版权曲目不入库，见 README）
├── src-tauri/               # Tauri 2 桌面壳
│   ├── src/main.rs
│   ├── tauri.conf.json      # frontendDist -> ../public
│   └── icons/
├── build.bat                # Windows 一键打包脚本
└── LICENSE
```

## 🚀 快速开始

### 网页版（最简单）

前端为 ES Modules，需通过 HTTP 访问（不可直接双击打开）：

```bash
# 任选一种静态服务器
python -m http.server 8000 --directory public
# 或
npx serve public
```

浏览器打开 <http://localhost:8000> 即可游玩。

### 联机对战

```bash
cd public/server
npm install
npm start          # 默认监听 0.0.0.0:8736
```

- 局域网：两名玩家各自打开网页版，客户端默认连接 `ws://当前主机:8736`，无需配置
- 手动指定服务器：页面地址追加参数 `?server=ws://192.168.x.x:8736`
- 公网 / HTTPS：浏览器禁止 HTTPS 页面连接明文 `ws://`，需经反向代理或隧道提供 `wss://`（如 `?server=wss://xxx.trycloudflare.com`）

服务器环境变量：`PORT`（端口，`0` 为随机）、`HOST`（监听地址）、`MAX_CONNS`（最大连接数，默认 64）。

### 桌面版（Tauri 2）

依赖：[Rust](https://rustup.rs/) 与 [Tauri CLI](https://tauri.app/start/prerequisites/)、Windows WebView2 运行时。

```bash
cargo install tauri-cli --version "^2"

cargo tauri dev        # 开发调试
cargo tauri build      # 打包（或直接运行 build.bat）
```

安装包输出至 `src-tauri/target/release/bundle/nsis/`。

### 运行测试

```bash
cd public/server
npm install
npm test               # node --test 协议测试
```

## 🎮 默认操作

| 动作 | P1 | P2 |
| --- | --- | --- |
| 移动 | `A` / `D` | `←` / `→` |
| 跳跃 | `W` | `↑` |
| 格挡 | `S` | `↓` |
| 轻攻击 | `J` | `小键盘 1` |
| 重攻击 | `K` | `小键盘 2` |
| 技能 1~3 | `U` `I` `O` | `小键盘 4` `5` `7` |
| 必杀技 | `P` | `小键盘 6` |
| 闪避 | `L` | `小键盘 3` |

> 所有键位均可在游戏内设置界面重绑（支持跨侧冲突检测）。

## 📄 许可证

[MIT](LICENSE) © 2026 FengXin

游戏代码（`public/`、`src-tauri/`）以 MIT 许可证开源。《咒术回战》名称及角色版权归原版权方所有；背景音乐为版权作品，**不在本仓库分发范围之内**。
