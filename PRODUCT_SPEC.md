# PRODUCT_SPEC.md — LocalArt Canvas 里程碑

> Claude（规划）从本文件自上而下拆 issue 喂流水线。一次只展开一个里程碑，做完再展开下一个。
> 完整背景见项目开发文档；此处只保留可拆解为任务的里程碑与特性。

## M0 · 环境与侦察（前置）
- Fork tldraw agent 模板，跑通官方 demo
- Gemini 出 `docs/research/tldraw-fork-map.md`（自定义 shape/action 挂载点、水印与云依赖位置）
- Gemini 出 `docs/research/comfyui-api.md`（提交 workflow / 取图 / 错误处理）
- 建好三 agent 的 GitHub 协作流（labels / 看板 / CI）

## M1 · MVP 核心闭环（第一优先级）
- 移除官方水印与云依赖
- 自定义 `AIImageHolder` 形状
- 侧边 AI Agent 面板 + tool 层（读选中形状 + 画布截图喂 LLM）
- 本地 LLM 接入：Ollama（OpenAI 兼容）
- 本地图像生成接入：ComfyUI Workflow API（默认 Flux.2 klein）
- **标注 → 一键生成修订版**闭环（画框/箭头/文字 → 生成干净新图置于原图旁）
- 本地持久化：画布数据自动存 `./canvas/`（JSON + assets）

> M1 的端到端验收：在画布上画一个标注框 → 触发一次生成 → 新图落到画布旁。

## M2 · 可用版
- Electron 打包（Windows / macOS / Linux）
- 混合模型切换 UI（本地 / 云端 fallback）
- 历史版本回溯 + 导出（PNG / JSON / ZIP）
- UI/UX 打磨（主题、快捷键、右键菜单）

## M3 · 进阶
- 插件系统（社区扩展）
- ControlNet / IP-Adapter 精准控制
- 批量生成 / A/B 测试
- 社区开源发布（可选）
