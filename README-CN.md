<h1 align="center">
  <br>
   马基
  <br>
</h1>

<h4 align="center">适用于 macOS 和 Linux 的快速原生 Markdown 查看器，使用 <a href="https://v2.tauri.app">Tauri v2</a>、<a href="https://react.dev">React</a> 和 <a href="https://github.com/markdown-it/markdown-it">markdown-it</a> 构建。表格、代码块、任务列表、数学和图表的精美渲染 - 通过实时重新加载。</h4>

<p align="center">
    <a href="https://github.com/GRVYDEV/marky/stargazers"><img src="https://img.shields.io/github/stars/GRVYDEV/marky" alt="Stars Badge"/></a>
    <a href="https://github.com/GRVYDEV/marky/network/members"><img src="https://img.shields.io/github/forks/GRVYDEV/marky" alt="Forks Badge"/></a>
</p>

<p align="center">
  <a href="https://youtu.be/nGBxt8uOVjc">查看演示</a> •
  <a href="#install">安装</a> •
  <a href="https://github.com/GRVYDEV/marky/issues">请求功能</a>
</p>

![Marky 截图](assets/marky-img.png)

<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary><h2 style="display: inline-block">目录</h2></summary>
  <ol>
    <li>
      <a href="#about-the-project">关于该项目</a>
      <ul>
        <li><a href="#features">功能</a></li>
      </ul>
    </li>
    <li>
      <a href="#install">安装</a>
      <ul>
        <li><a href="#homebrew-macos">自制程序 (macOS)</a></li>
        <li><a href="#ubuntu--debian">Ubuntu / Debian</a></li>
        <li><a href="#appimage-linux">AppImage (Linux)</a></li>
        <li><a href="#from-source">来源</a></li>
      </ul>
    </li>
    <li><a href="#usage">用法</a></li>
    <li><a href="#keyboard-shortcuts">键盘快捷键</a></li>
    <li><a href="#development">发展</a></li>
    <li><a href="#built-with">内置</a></li>
    <li><a href="#roadmap">路线图</a></li>
    <li><a href="#contributing">贡献</a></li>
    <li><a href="#contact-me">联系我</a></li>
  </ol>
</details>

## 关于该项目

Marky 是一款桌面 Markdown 查看器，其设计目的是：从终端打开 `.md` 文件并获得精美的即时渲染。使用 `marky FILENAME` 启动它以查看文件，或使用 `marky FOLDER` 将文件夹打开为持久工作区（黑曜石风格）。文件在磁盘上发生更改时会实时重新加载 - 非常适合在编写时查看 Claude 生成的计划、文档或注释。

### 特点

- **CLI-first** — `marky README.md` 打开一个窗口。 `marky ./docs/` 打开一个文件夹。
- **实时重新加载** — 磁盘上的编辑（来自您的编辑器、Claude 等）会立即更新视图。
- **文件夹** — 添加文件夹作为持久工作区（黑曜石风格）。它们出现在侧边栏中并在启动时恢复。- **Cmd+K 命令面板** — 在所有打开的文件夹中模糊搜索文件，由 [nucleo](https://github.com/helix-editor/nucleo) 提供支持。
- **语法突出显示** — [Shiki](https://shiki.style) 带有 VS Code 主题，可提供准确、美观的代码块。
- **数学** — KaTeX 渲染 `$inline$` 和 `$$display$$` 数学。
- **美人鱼图** — 围栏 `mermaid` 块渲染为 SVG。
- **GFM** — 表格、任务列表、删除线、自动链接、脚注。
- **浅色和深色主题** — 遵循系统偏好或手动切换。
- **净化渲染** — 所有 HTML 都通过 DOMPurify 运行。可以安全地查看不受信任的降价。
- **小而快** - 原生 webview，无 Electron。生产 `.dmg` 小于 15 MB。

## 安装

### 自制程序 (macOS)

_注意_：我目前正在等待苹果开发者审核，因此暂时该应用程序尚未签名。这个问题很快就会得到解决。

```bash
brew tap GRVYDEV/tap
brew install --cask GRVYDEV/tap/marky
# This is temporary until I can sign the binary
xattr -cr /Applications/Marky.app
```

### Ubuntu / Debian

Download the `.deb` for your architecture from the [latest release](https://github.com/GRVYDEV/marky/releases/latest):

```bash
# amd64
curl -LO https://github.com/GRVYDEV/marky/releases/latest/download/marky_0.1.2_amd64.deb
sudo dpkg -i marky_0.1.2_amd64.deb

# arm64
curl -LO https://github.com/GRVYDEV/marky/releases/latest/download/marky_0.1.2_arm64.deb
sudo dpkg -i marky_0.1.2_arm64.deb
```

### AppImage (Linux)

Download the AppImage from the [latest release](https://github.com/GRVYDEV/marky/releases/latest):

```bash
curl -LO https://github.com/GRVYDEV/marky/releases/latest/download/Marky_0.1.2_amd64.AppImage
chmod +x Marky_0.1.2_amd64.AppImage
./Marky_0.1.2_amd64.AppImage
```

### From Source

Requires [Rust](https://rustup.rs/), [Node.js](https://nodejs.org/), and [pnpm](https://pnpm.io/).

```bash
git clone https://github.com/GRVYDEV/marky.git
cd marky
pnpm install
pnpm tauri build
./scripts/install-cli.sh
```

The install script symlinks `marky` to `~/.local/bin/`. Make sure that's on your `PATH`:

```bash
# bash/zsh
export PATH="$HOME/.local/bin:$PATH"

# fish
set -Ux fish_user_paths $HOME/.local/bin $fish_user_paths
```

## Usage

```bash
# Open a single file
marky README.md

# Open a folder as a workspace
marky ./docs/

# Open with no args — restores your last session
marky
```

## Keyboard Shortcuts

| Shortcut      | Action                              |
| ------------- | ----------------------------------- |
| `Cmd+K`       | Command palette (fuzzy file search) |
| `Cmd+O`       | Open file                           |
| `Cmd+Shift+O` | Add folder                          |
| `Cmd+F`       | Search in page                      |

## Development

```bash
pnpm install
pnpm tauri dev       # dev server with HMR
```

### Run Tests

```bash
# Frontend
pnpm test

# Rust
cd src-tauri && cargo test
```

### Project Structure

```
src-tauri/       Rust backend — CLI, file I/O, file watching, folder registry, fuzzy search
src/             React frontend — markdown pipeline, UI components, theme
src/components/  App components (Viewer, Sidebar, CommandPalette, etc.)
src/components/ui/  shadcn/ui primitives
src/lib/         Core logic (markdown-it config, Shiki, Tauri IPC wrappers)
src/styles/      Tailwind base + markdown prose styles
scripts/         Install helpers
```

## Built With

| Layer               | Tech                                                      |
| ------------------- | --------------------------------------------------------- |
| Desktop shell       | [Tauri v2](https://v2.tauri.app)                          |
| Frontend            | React + TypeScript + Vite                                 |
| Markdown            | [markdown-it](https://github.com/markdown-it/markdown-it) |
| Syntax highlighting | [Shiki](https://shiki.style)                              |
| Math                | [KaTeX](https://katex.org)                                |
| Diagrams            | [Mermaid](https://mermaid.js.org)                         |
| Fuzzy search        | [nucleo](https://github.com/helix-editor/nucleo)          |
| UI primitives       | [shadcn/ui](https://ui.shadcn.com)                        |
| Styling             | [Tailwind CSS](https://tailwindcss.com)                   |
| File watching       | [notify](https://github.com/notify-rs/notify)             |

## Roadmap

- **Built-in AI chat** — chat with Claude Code or Codex directly inside your markdown documents
- **Git diff review** — view and review local git diffs without leaving the app

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create.
Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch: `git checkout -b feature/AmazingFeature`
3. Commit your Changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the Branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

Before submitting a PR:

- Run `pnpm test` and `cd src-tauri && cargo test`
- Run `pnpm typecheck`
- Actually open a markdown file with `pnpm tauri dev` and verify it renders correctly

## Contact Me

> GitHub [@GRVYDEV](https://github.com/GRVYDEV) &nbsp;&middot;&nbsp;
> Twitter [@grvydev](https://twitter.com/grvydev)
