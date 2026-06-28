# LocalArt Canvas v0.1.0 · Windows Agent 测试交接文档

测试目标：在 Windows 实机上验证 v0.1.0 首版安装包是否能安装、启动、连接本地服务，并跑通核心画布闭环。

## 1. Release 信息

- 仓库：`planedob/localart-canvas`
- Release：<https://github.com/planedob/localart-canvas/releases/tag/v0.1.0>
- Tag：`v0.1.0`
- 状态：已发布
- Release workflow：<https://github.com/planedob/localart-canvas/actions/runs/28143673886>
- Windows 包来自该 workflow 的 `Package (windows-latest)` job。

## 2. Windows 需要下载的文件

从 Release 页面下载：

1. `x64-LocalArt.Canvas-0.1.0.Setup.exe`
2. `SHA256SUMS-windows.txt`

可选下载：

- `x64-localart_canvas-0.1.0-full.nupkg`
- `x64-RELEASES`

Windows 侧优先测试 `Setup.exe`。`full.nupkg` 和 `RELEASES` 属于 Squirrel 更新/安装产物，首轮不用手动打开。

## 3. SHA256 校验

在 PowerShell 里进入下载目录：

```powershell
Get-FileHash ".\x64-LocalArt.Canvas-0.1.0.Setup.exe" -Algorithm SHA256
Get-Content ".\SHA256SUMS-windows.txt"
```

确认 `Setup.exe` 的 hash 与 `SHA256SUMS-windows.txt` 中对应行一致。

已知 Release asset digest：

```text
x64-LocalArt.Canvas-0.1.0.Setup.exe
sha256:57bf83e30e0faf2381241bd54db3031ad32083e1f18cb0ab1f97c2101018b8d6

x64-localart_canvas-0.1.0-full.nupkg
sha256:a3158ca2b743ba461158a2f991ba05524d1f2ddc88883a0c9de23202a8223e9b

x64-RELEASES
sha256:c9448ef8578d798345362dbc14e7b28bfd09d7d900516d20a46850a2a2b1a58d

SHA256SUMS-windows.txt
sha256:736cc473b0aa2856d86214e00160b8fabc265de67537ddfcd1ed4bf9fa300225
```

## 4. 测试环境准备

推荐环境：

- Windows 10/11 x64
- PowerShell
- 可访问 GitHub Release 下载
- 本地 Ollama
- 本地 ComfyUI

LocalArt Canvas 不会自动安装、启动或停止 Ollama / ComfyUI。测试前需要手动启动：

```powershell
ollama serve
```

ComfyUI 按本机已有方式启动，默认应监听：

```text
http://127.0.0.1:8188
```

Ollama 默认应监听：

```text
http://127.0.0.1:11434
```

如果没有本地图像模型，可以先做“启动 / 画布 / 配置 / 错误提示”测试；完整 M1 生成闭环需要 ComfyUI workflow 和可用模型。

## 5. 安装与启动

1. 双击 `x64-LocalArt.Canvas-0.1.0.Setup.exe`。
2. 如果 Windows SmartScreen 提示未知发布者，选择“更多信息”→“仍要运行”。
3. 等待安装完成，应用应自动启动或出现在开始菜单。
4. 启动后观察右侧服务状态：
   - Electron app 能打开；
   - LocalArt 内置服务能启动；
   - Ollama / ComfyUI 状态能显示连接成功或明确的连接失败原因。

记录：

- 应用窗口是否能正常出现；
- 是否白屏；
- 是否有崩溃弹窗；
- 服务状态里显示的 `userData/canvas` 路径。

## 6. 基础功能测试

### 6.1 画布基础操作

1. 新建一个文本框，输入任意文字。
2. 画一个矩形或箭头。
3. 拖动画布对象，确认能移动。
4. 删除对象，确认能删除。

通过标准：

- 画布可交互；
- 没有明显卡死；
- 对象可创建、移动、删除。

### 6.2 持久化恢复

1. 在画布上保留至少一个文本框和一个形状。
2. 关闭 LocalArt Canvas。
3. 重新打开应用。
4. 检查之前的画布内容是否恢复。

通过标准：

- 重启后画布内容恢复；
- 服务状态里显示的 canvas 路径应在 Windows 用户数据目录下，而不是仓库目录。

## 7. M1 核心闭环测试

目标：选中画布对象 → 生成提示词 → ComfyUI 生成图片 → 新图落到画布旁边。

步骤：

1. 确认 Ollama 和 ComfyUI 都已启动。
2. 在画布中放入一张图片，或创建一个 `AIImageHolder`/图片对象。
3. 在图片附近画一个标注框、箭头或文字说明，例如：

   ```text
   把背景改成夜晚城市灯光，保持主体构图
   ```

4. 选中原图和标注对象。
5. 点击 AI 面板里的生成/修订按钮，或使用快捷键：

   ```text
   Ctrl + Shift + G
   ```

6. 等待 LLM 生成提示词，再等待 ComfyUI 返回图片。
7. 检查新生成图片是否出现在原图旁边。

通过标准：

- AI 面板能读到当前选择对象；
- 能产生可见提示词或回应；
- ComfyUI 成功时，新图落到画布上；
- ComfyUI 失败时，错误信息可读，不是一坨原始堆栈。

## 8. 云端 / fallback 简测

如果 Windows 测试机有 OpenAI-compatible endpoint 和 key，可测：

1. 打开模型配置。
2. 配置 Primary 为一个不可用地址或错误模型。
3. 配置 Backup 为一个可用 OpenAI-compatible endpoint。
4. 发送一次文本请求。

预期：

- 非鉴权类错误可 fallback 到 Backup；
- 如果 Primary 是 401/403，首版会直接暴露配置错误，不自动切 Backup；
- UI 应显示可读错误或 fallback 原因。

注意：不要把 API key 截图、录屏、提交到仓库或发给第三方。

## 9. 导出测试

至少测试一种导出：

1. 画布上保留一个文本框或图片。
2. 尝试导出 PNG：

   ```text
   Ctrl + Shift + P
   ```

3. 如果 UI 有 JSON / ZIP 导出入口，也测试一次。

通过标准：

- 能生成文件；
- 文件能打开；
- 没有崩溃。

## 10. 需要截图/录屏的证据

请 Windows agent 回传以下材料：

1. 安装包下载文件列表截图。
2. PowerShell `Get-FileHash` 校验截图。
3. 应用启动首页截图。
4. 服务状态截图，需能看到 Ollama / ComfyUI 状态。
5. 画布基础操作截图。
6. 重启后画布恢复截图。
7. M1 闭环前后截图或短录屏。
8. 如失败，附失败弹窗、控制台日志或应用内错误文字。

避免截图中出现：

- API key；
- token；
- 私人聊天；
- 机器上的敏感路径或隐私文件名。

## 11. 回报模板

Windows agent 测完后按这个格式回报：

```md
# LocalArt Canvas v0.1.0 Windows 测试回报

## 环境
- Windows 版本：
- CPU / 内存：
- Ollama 版本：
- ComfyUI 启动方式：
- 测试时间：

## 安装
- Setup.exe 是否可下载：
- SHA256 是否匹配：
- 是否触发 SmartScreen：
- 是否安装成功：

## 启动
- 应用是否启动：
- 是否白屏/崩溃：
- userData/canvas 路径：

## 服务连接
- Ollama 状态：
- ComfyUI 状态：
- 错误信息是否可读：

## 画布
- 创建/移动/删除对象：
- 重启恢复：

## M1 闭环
- 是否跑通“标注 → 生成修订版 → 新图落画布”：
- 失败时卡在哪一步：
- 截图/录屏路径：

## 导出
- PNG：
- JSON/ZIP：

## 结论
- 通过 / 不通过：
- 阻塞问题：
- 非阻塞问题：
```

## 12. 已知限制

- Windows 包未签名，SmartScreen 提示属于预期。
- 首版不会自动安装或托管 Ollama / ComfyUI。
- 云端模型 key 只应存在用户本机配置里，不应进仓库或日志。
- 纯聊天响应目前非流式，短提示词生成可接受。
- Windows / Linux GUI 属于本轮需要实机补验的重点。
