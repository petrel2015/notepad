# Notepad

[Chrome 扩展：构建、安装与验收](docs/zh/extension.md) · `npm run build:extension` → `dist-extension/`

[English](README.md) | 简体中文

在浏览器本地运行的文本工作台：编辑、查找替换、双文本对比、JSON 工具和可导入导出的主题。

**状态：可运行初版，支持 GitHub Pages 部署。** 完整目标见需求文档，实际能力与证据见[当前实现与验收](docs/zh/implementation.md)。

在线地址：[Notepad](https://petrel2015.github.io/notepad/)（部署状态见 [GitHub Actions](https://github.com/petrel2015/notepad/actions)）。

## 开始使用

```sh
npm install
npm run dev
```

打开终端打印的本地地址。已验证环境：Node 22.22.3、npm 10.9.8。源码通过 Vite 构建，依赖打包进产物，不使用运行时 CDN。

## 当前能力

- 多标签编辑、UTF-8 文件打开/导入/另存、撤销重做、行列和选区计数、可见字符。
- Worker 查找高亮、选区/全文替换、正则超时保护；JSON 无损数字格式化、校验、压缩和文本整理。
- 双文本行级/行内对比、同步滚动、差异跳转、双向合并及撤销。
- 黑白 JSON 主题，自定义编辑、导入导出与 localStorage 持久化。
- 大文件分块浏览、全局固定文本查找和流式替换实现；真实浏览器已核对 100 MiB 和 1 GiB 样本的搜索计数。

大文件原生另存需要源文件句柄和可写文件能力，**浏览器原生落盘尚未端到端验证**；100 MiB 算法磁盘读写已验证。混合换行先只读，编码仅 UTF-8。草稿不会自动恢复。详见[限制与证据](docs/zh/implementation.md)。

## 渐进式阅读

| 目的 | 入口 |
| --- | --- |
| 怎么操作 | [使用指南](docs/zh/usage.md) |
| 已实现什么、验证到哪里 | [当前实现](docs/zh/implementation.md) |
| 完整目标和阶段 | [需求](docs/zh/requirements.md) · [计划](docs/zh/roadmap.md) |
| 架构和模块 | [架构](docs/zh/architecture.md) |
| 修改大文件/主题机制 | [大文件](docs/zh/features/large-files.md) · [主题](docs/zh/features/themes.md) |
| 开发、测试、复现 | [开发指南](docs/zh/development.md) |
| AI/Hermes 按任务读取 | [README_FOR_AI](README_FOR_AI.md) |

[文档索引](docs/zh/index.md) · [变更记录](CHANGELOG.zh.md)。许可证尚未确定。

![Notepad — local editor](docs/img/editor-light.png)
