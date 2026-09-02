@echo off
chcp 65001 >nul
echo 正在打包 Tauri 应用...
echo 请确保已安装 Rust（https://rustup.rs/）和 cargo-tauri。
echo.
cargo tauri build
echo.
echo 打包完成。安装包位于 src-tauri\target\release\bundle\ 目录。
pause
