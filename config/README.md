# ComfyUI workflow

仓库提供已在 Apple M4 16GB + ComfyUI `v0.25.1` 验证的 Flux.2 klein 4B 示例：

```bash
cp config/comfyui-workflow.example.json config/comfyui-workflow.json
```

模型文件：

```text
models/diffusion_models/flux-2-klein-4b.safetensors
models/text_encoders/qwen_3_4b_fp4_flux2.safetensors
models/vae/flux2-vae.safetensors
```

示例正向提示词节点 ID 为 `4`：

```bash
COMFYUI_PROMPT_NODE_ID=4 npm run dev
```

Apple MPS 当前不能运行 FP8 diffusion 权重，需使用上面的 BF16 文件。NVIDIA 环境可把 `unet_name` 改为 `flux-2-klein-4b-fp8.safetensors` 以减少显存占用。

自定义工作流仍可通过 ComfyUI 的 `File → Export Workflow (API)` 导出为 `config/comfyui-workflow.json`，并用 `COMFYUI_PROMPT_NODE_ID` 指定包含 `text` 输入的正向提示词节点。
