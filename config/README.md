# ComfyUI workflow

将 ComfyUI 中验证可运行的图像工作流通过 `File → Export Workflow (API)` 导出为：

```text
config/comfyui-workflow.json
```

默认正向提示词节点 ID 为 `6`。若实际工作流不同，启动前设置：

```bash
COMFYUI_PROMPT_NODE_ID=<node-id> npm run dev
```

工作流文件通常包含本机模型文件名，不提交到仓库，避免把机器相关配置误当成通用默认值。
