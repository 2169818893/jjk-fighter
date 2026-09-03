# 更新日志

本项目的全部显著变更将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 仓库规范化：社区文件（SECURITY / CONTRIBUTING / 行为准则）、issue 与 PR 模板、Dependabot 配置
- 根目录 ESLint 与前端全量语法检查（`npm run check` / `npm run lint`），并接入 CI

### Changed

- 服务端：房间状态改为模块级隔离、支持优雅关闭（SIGINT/SIGTERM）、日志分级（LOG_LEVEL）、未配置 ALLOWED_ORIGINS 时输出安全告警
- 联机协议升级至 `PROTO_VER = 2`：选人阶段携带角色表指纹（rosterHash），不一致时拒绝开局，防止协议层静默错位
- 客户端：设置与键位持久化到 localStorage、清理 `var` 与死代码、RNG 种子日志仅在调试模式下输出

### Fixed

- README 与实际内容不符的角色数、模式数与错别字
- Tauri 安全配置（CSP、关闭 assetProtocol、bundle identifier）
- LICENSE 补充 SCOPE NOTICE（MIT 仅覆盖源代码，不授予角色 IP）

## [1.0.0] - 2026-09-02

### Added

- 21 名角色的 2D 格斗核心（受击、命中、连段、必杀演出）
- 单人模式：街机闯关、无限模式、训练场、AI 对战
- 本地双人同屏对战与 WebSocket 在线联机（6 位房间码）
- Tauri 2 桌面打包（Windows）
