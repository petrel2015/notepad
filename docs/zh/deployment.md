# 构建与部署

站点地址：https://petrel2015.github.io/notepad/ 。仓库：https://github.com/petrel2015/notepad 。

GitHub Pages 通过 `.github/workflows/pages.yml` 发布。推送 main 后依次执行 npm ci、单元测试和网页构建，将 dist 上传为 Pages artifact，再部署。也可在 Actions 手动触发。部署完成以 Actions 的 deploy 作业成功为准。

`vite.config.ts` 使用相对资源地址，适配 /notepad/ 子路径；编辑器、CSS、favicon 和两个 Worker 一起打包。原生文件选择权限和大文件限制不因托管改变。没有 Service Worker、PWA 或离线缓存承诺。

本地复现：`npm ci`、`npm test`、`npm run build`。发布后验证主页、静态资源、查找 Worker 和大文件 Worker。扩展仍独立构建，见 [扩展指南](extension.md)。

GitHub 默认三级域名属于账号，因此这里是 petrel2015.github.io，notepad 是项目路径。要使用 notepad.example.com，需拥有 example.com 并配置 DNS CNAME 指向 petrel2015.github.io，再在 Pages 配置完整域名及 HTTPS。不要把 CNAME 指向 /notepad/ 路径。

[English](../en/deployment.md)

2026-11-26 发布验收：GitHub Actions run 45732448285 成功；HTTPS 主页返回 200；真实浏览器普通查找匹配 5 处，100 MiB 样本搜索 token-needle 匹配 1,978,446 处。原生另存未在本次验收中验证。
