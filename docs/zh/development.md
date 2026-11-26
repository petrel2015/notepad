# 开发与复现

已验证 Node 22.22.3、npm 10.9.8；Vite 6、TypeScript 5、CodeMirror 6。精确依赖版本见 package-lock.json。无服务端和业务模型调用。

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
python3 scripts/generate-fixtures.py
NOTEPAD_LARGE_ACCEPTANCE=1 npm test -- tests/large-acceptance.test.ts
```

上述命令已实际执行。默认测试为 16 项单元测试，额外磁盘测试默认跳过；生成夹具后用最后一条单独启用。`python3 scripts/generate-fixtures.py --gib` 额外生成 1 GiB 样本，执行前留出磁盘空间。生成文件和报告在被忽略的 .local 下，不提交大样本。

| 实际模块 | 职责 |
| --- | --- |
| src/main.ts / style.css | 界面、标签/文件会话、任务调度、保存、主题管理 |
| src/editor.ts | CodeMirror 适配、主题令牌、可见字符 |
| src/text.ts | JSON 数字保真、重复键校验、统计和整理 |
| src/search-core.ts / search.worker.ts | 普通查找、捕获组替换计算、超时隔离 |
| src/large-core.ts / large.worker.ts | 有界分块 UTF-8、字节窗口、查找替换、输出关闭/中止 |
| src/themes.ts / themes/*.json | 主题白名单、默认值、黑白配置 |
| tests/ | 确定性边界测试和按需磁盘验收 |

目前应用协调集中在 main.ts；后续扩展再沿架构设计拆分文件/会话服务，不宣称已实现所有建议目录。没有 lint 配置；使用类型检查、测试和构建，不把未运行 lint 标成通过。

Hermes 后续任务应先读 README_FOR_AI，再读相关功能与当前验收。报告命令、真实结果、失败样本、限制；不要包含正文或敏感路径。可重现错误用合成夹具。性能证据区分算法、浏览器和原生磁盘输出。

[English](../en/development.md)

代码格式：`npm run format` 写入格式，`npm run format:check` 检查；两者已执行通过。`npm run preview -- --port 4173` 已用于生产产物的本地浏览器验收。
