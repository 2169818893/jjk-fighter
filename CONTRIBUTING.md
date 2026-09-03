# 贡献指南

感谢关注本项目！这是一个**非商业同人**项目，欢迎提交 Issue 与 Pull Request。

## 开发环境

- Node.js >= 20（仓库内置 `.nvmrc`，可用 `nvm use` 切换）
- 可选：Rust 工具链 + Tauri CLI（仅桌面打包需要）
- 前端为原生 ESM、**无构建步骤**，用任意静态服务器托管 `public/` 即可运行

## 本地运行

```bash
# 前端（浏览器访问 http://localhost:8080）
npx serve public

# 联机服务器
cd public/server
npm ci
npm start

# 桌面端（可选）
cd src-tauri && cargo tauri dev
```

## 测试与检查

提交前请在仓库根目录执行：

```bash
npm run check   # 前端全量语法检查（node --check）
npm run lint    # ESLint
npm test        # 转发到 public/server 的协议测试
```

## 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

```
feat: 新增训练场连段显示
fix(server): 修复房间码冲突时的重建逻辑
docs: 更新联机环境变量说明
```

常用类型：`feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `ci`。

## 代码约定

- 原生 ESM（`import` / `export`），不引入打包工具与框架
- 2 空格缩进；不使用 `var`，优先 `const`
- 浏览器端代码禁止 `eval`、内联事件与 `innerHTML` 注入外部数据（受 Tauri CSP 约束）
- **联机协议变更必须同步提升客户端与服务端的 `PROTO_VER`，并在 `public/server/test/` 补充测试**

## 版权提醒

本项目为非商业同人作品，角色知识产权归原权利方所有，详见 [LICENSE](LICENSE) 的 SCOPE NOTICE 与 [README](README.md)。
请勿提交任何可能引入版权风险的资源（未授权的官方立绘、音乐、语音等）。

## 行为准则

参与贡献即表示同意 [行为准则](CODE_OF_CONDUCT.md)。
