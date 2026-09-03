# 安全策略

## 支持的版本

| 版本 | 支持状态 |
| ---- | -------- |
| main 分支最新提交 | :white_check_mark: 支持 |

本项目为快速迭代的同人作品，仅为最新主干提供安全修复。

## 如何报告漏洞

- **请勿在公开 Issue 中披露安全漏洞。**
- 优先使用 GitHub 的「Private vulnerability reporting」：仓库 **Security** 标签页 → **Report a vulnerability** 私密报告。
- 也可通过仓库作者主页 <https://github.com/2169818893> 上的公开联系方式私下联系。

## 关注范围

本项目为非商业同人网页 / 桌面游戏，攻击面主要包括：

| 组件 | 位置 | 说明 |
| ---- | ---- | ---- |
| 联机服务器 | `public/server/net-server.mjs` | WebSocket 房间服务器（Origin 校验、房间管理、输入转发） |
| 联机客户端 | `public/js/net.js` | 客户端联机协议 |
| 桌面打包 | `src-tauri/` | Tauri 2 配置（CSP、assetProtocol） |
| 游戏页面 | `public/` | 纯前端 ESM 代码 |

以下类别视为高优先级：

- 远程代码执行 / XSS（游戏页面、服务器消息处理）
- 联机协议伪造（房间接管、回合欺骗、角色表指纹 `rosterHash` 绕过）
- 服务端资源耗尽（未鉴权连接洪泛、恶意超大消息）

## 响应目标

- 48 小时内确认收到报告
- 7 天内给出初步评估与处理计划
- 修复发布后在 CHANGELOG 中致谢报告者（如愿意署名）
