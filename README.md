# picgo-plugin-cfbed

[![npm](https://img.shields.io/npm/v/picgo-plugin-cfbed)](https://www.npmjs.com/package/picgo-plugin-cfbed)
[![npm downloads](https://img.shields.io/npm/dm/picgo-plugin-cfbed)](https://www.npmjs.com/package/picgo-plugin-cfbed)
[![license](https://img.shields.io/npm/l/picgo-plugin-cfbed)](LICENSE)

PicGo / PicList 图床插件，对接 [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) ，支持上传与远程删除同步。

## 功能

- 多上传渠道：Telegram / Cloudflare R2 / S3 / Discord / HuggingFace / WebDAV
- 双鉴权方式：API Token（推荐，支持完整权限） 与上传认证码
- 灵活的文件命名策略与返回格式
- 上传目录自定义
- 服务端压缩（Telegram 图片）
- 失败自动切换渠道重试
- 配合 [PicList](https://github.com/Kuingsmile/PicList) 使用，删除图片时自动同步删除云端文件

## 安装

### 插件商店（推荐）

在 PicGo 或 PicList 的「插件设置」中搜索 `cfbed` 安装。

### 手动安装

```bash
# PicGo
cd ~/.picgo
npm install picgo-plugin-cfbed

# PicList
cd ~/.config/piclist
npm install picgo-plugin-cfbed
```

## 配置

在 PicGo/PicList 图床设置中找到 **Cloudflare ImgBed**，填写以下配置：

| 配置项 | 必填 | 默认值 | 说明 |
|-------|------|-------|------|
| 站点URL | 是 | — | CloudFlare-ImgBed 站点地址，如 `https://img.example.com` |
| 上传认证码 | 否 | — | 在管理后台填写，与 API Token 二选一即可 |
| API Token | 否 | — | 在管理后台生成，需勾选 `upload` / `delete` / `list` 权限 |
| 上传渠道 | 否 | telegram | telegram / cfr2 / s3 / discord / huggingface / webdav |
| 频道名称 | 否 | — | 用于多频道场景，区分不同上传通道 |
| 文件命名 | 否 | default | default（前缀+原名）/ index（仅前缀）/ origin（仅原名）/ short（短链接） |
| 返回格式 | 否 | full | full（完整URL）/ default（相对路径） |
| 上传目录 | 否 | — | 子目录路径，如 `img/test` |
| 服务端压缩 | 否 | 开启 | 仅对 Telegram 上传的图片生效 |
| 自动重试 | 否 | 开启 | 上传失败时自动切换到其他渠道重试 |
| 启用远程删除 | 否 | 开启 | 在 PicList 中删除图片时同步调用服务端 `/api/manage/delete/` 接口 |

> **远程删除**需 API Token 包含 `delete` 权限。删除 API 为 CloudFlare-ImgBed 内置功能，无需额外部署。

## 使用

1. 在 PicGo/PicList 图床设置中，选择「Cloudflare ImgBed」为默认图床
2. 拖拽或粘贴图片，自动上传到配置的服务端
3. 上传成功后自动返回图片链接（Markdown / HTML / URL 等格式）

在 PicList 中删除图片记录时，插件会自动调用服务端删除 API 同步删除云端文件。

## 相关项目

| 项目 | 说明 |
|------|------|
| [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) | A serverless, open-source file hosting solution built on Cloudflare. |
| [PicGo](https://github.com/Molunerfinn/PicGo) | 图片上传客户端 |
| [PicList](https://github.com/Kuingsmile/PicList) | PicGo 增强版，支持更多功能 |

## 许可

[MIT](LICENSE) © [LacYor](https://github.com/LacYor)

本插件为 [MarSeventh/CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)（MIT License）的第三方PicGo插件，并非官方维护。
