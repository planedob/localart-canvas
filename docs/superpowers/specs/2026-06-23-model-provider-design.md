# M2 第二阶段 · 统一模型 Provider 与主备路由设计

状态：已批准

依据：用户提供的《M2 · 验收闸口 + 模型接入决策》及 2026-06-23 逐节设计确认

## 1. 目标

在不破坏现有 Ollama 画布闭环的前提下，把文本/视觉理解模型统一到一个聊天抽象中，并增加一个 OpenAI-compatible 云端入口。用户可在侧栏配置 Primary 与 Backup 两个槽位，按自己的顺序组合 Ollama、AIBuff、官方 OpenAI 或任意 OpenAI-compatible 端点。

本阶段默认 Primary 为 Ollama。AIBuff 是默认云端预设，但没有 API Key 时不启用。首版不实现 Anthropic、Gemini、Grok 的原生 SDK；这些模型可通过 AIBuff 或对应的 OpenAI-compatible 端点使用。

## 2. 范围

### 2.1 本阶段交付

- 一个统一的 `ChatBackend` 接口。
- Ollama 与 OpenAI-compatible 两种后端实现。
- Primary、Backup 两槽位路由与用户可配置顺序。
- AIBuff、官方 OpenAI、Ollama、自定义端点预设。
- 文字与 OpenAI vision `image_url` 多模态请求。
- 配置侧栏、连接测试、保存与状态反馈。
- 环境变量及本地配置文件两种配置来源。
- 本地密钥文件、脱敏日志与明确的 fallback 规则。

### 2.2 明确不做

- Anthropic、Gemini、Grok 原生 SDK 或原生消息格式。
- provider 独有能力，例如 PDF、citations、extended thinking、prompt caching。
- 模型自动发现与云端模型目录同步。
- OS Keychain、Credential Manager 或可视化密钥保险库。
- 超过两个槽位的任意长度路由链。
- 自动安装、启动或停止 Ollama。
- 修改 ComfyUI 图像生成适配器；它继续消费聊天结果生成的提示词。

## 3. 核心架构

### 3.1 统一接口

服务层定义与具体厂商无关的接口：

```ts
interface ChatBackend {
	chat(request: ChatRequest): Promise<ChatResult>
	testConnection(): Promise<ConnectionTestResult>
}
```

`ChatRequest` 保留现有字段：用户消息、选中 shape 摘要和可选画布截图。`ChatResult` 包含回复文本、实际模型、槽位、provider 类型和是否发生 fallback。

实现分为：

- `OllamaChatBackend`：保留模型发现、已安装模型校验和成功后卸载模型的现有行为。
- `OpenAICompatibleChatBackend`：向 `<base_url>/chat/completions` 发送 OpenAI 格式请求，通过 Bearer API Key 认证。
- `ChatRouter`：解析配置，先调用 Primary；仅在允许的错误类别下调用启用且配置完整的 Backup。

Express 的 `/api/chat` 只依赖 `ChatRouter`，不再直接依赖 `OllamaClient`。Renderer 继续调用本地 HTTP API，不直接调用云端，也不读取磁盘密钥。

### 3.2 两个路由槽位

Primary 与 Backup 使用同一配置结构：

```ts
interface ModelSlotConfig {
	enabled: boolean
	provider: 'ollama' | 'openai-compatible'
	preset: 'ollama' | 'aibuff' | 'openai' | 'custom'
	baseUrl: string
	model: string
	timeoutMs: number
}
```

初始默认值：

- Primary：Ollama，`http://127.0.0.1:11434`，模型沿用 `OLLAMA_MODEL`；启用。
- Backup：AIBuff，`https://api.aibuff.cc/v1`；没有 API Key 或模型名时禁用。

用户可以交换 Primary 与 Backup，也可以把任一槽位改为 Ollama 或 OpenAI-compatible。首版不增加隐藏的第三候选项。

## 4. 配置与密钥

### 4.1 文件位置

配置目录可由 `LOCALART_CONFIG_DIR` 覆盖。默认位置：

- Electron：`app.getPath('userData')/config`。
- 浏览器开发模式：仓库根目录 `./.localart/`，该目录加入 `.gitignore`。

普通配置写入 `model-providers.json`，密钥单独写入 `model-secrets.json`。写入采用临时文件加原子替换；密钥文件在支持 POSIX 权限的平台上设为 `0600`。Windows 依赖当前用户目录的系统访问控制，并在文档中说明首版未接 Credential Manager。

### 4.2 环境变量优先级

解析顺序从高到低为：

1. `LOCALART_PRIMARY_*`、`LOCALART_BACKUP_*` 环境变量。
2. 本地配置及密钥文件。
3. 内置默认值。

每个槽位支持 `PROVIDER`、`BASE_URL`、`API_KEY`、`MODEL`、`TIMEOUT_MS`、`ENABLED`。现有 `OLLAMA_BASE_URL` 与 `OLLAMA_MODEL` 在没有 Primary 专用配置时继续作为 Ollama 默认值，保证升级后原有运行命令有效。

被环境变量覆盖的字段在 UI 中显示“由环境变量控制”并设为只读，避免用户保存后误以为已生效。

### 4.3 密钥更新语义

配置 API 不返回密钥，只返回 `hasApiKey: true | false`。保存时密钥操作必须显式表示为：

- `retain`：保留已有密钥。
- `set`：写入新的非空密钥。
- `clear`：明确删除密钥。

空输入默认等于 `retain`，防止编辑其他字段时意外清除密钥。

## 5. 预设与请求格式

### 5.1 预设

- Ollama：`http://127.0.0.1:11434`，不要求真实 API Key；后端自行调用 `/api/tags`、`/v1/chat/completions` 与卸载接口。
- AIBuff：`https://api.aibuff.cc/v1`。
- 官方 OpenAI：`https://api.openai.com/v1`。
- 自定义：用户填写任意 `http` 或 `https` OpenAI-compatible Base URL。

Base URL 保存前移除尾部 `/`。禁止把 API Key 放入 URL 查询参数或用户信息部分。预设只填充默认值，用户仍可改模型名；首版不自动查询模型列表。

### 5.2 多模态消息

文字上下文与现有实现保持一致：用户指令后附选中 shape 的序列化摘要。存在画布截图时，用户消息使用：

```json
[
  { "type": "text", "text": "..." },
  { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
]
```

请求固定使用非流式响应。服务只读取 `choices[0].message.content`；空响应视为 provider 错误。首版不增加厂商特有兼容分支。

## 6. 路由与 fallback

一次 `/api/chat` 的处理顺序：

1. 校验请求与当前槽位配置。
2. 构造统一 `ChatRequest`。
3. 调用 Primary，并记录槽位、provider 和模型，不记录密钥或完整截图。
4. Primary 成功则立即返回。
5. Primary 失败时分类错误；只有可 fallback 错误才尝试 Backup。
6. Backup 成功时返回其结果及 Primary 失败的脱敏原因。
7. 双端失败时返回结构化错误，分别包含两个槽位的安全摘要。

允许 fallback：

- DNS、拒绝连接及其他网络连接失败。
- 请求超时或连接中断。
- HTTP 429。
- HTTP 500–599。

禁止 fallback：

- HTTP 400、401、403、404、409、422 等客户端或配置错误。
- 本地配置缺失、API Key 缺失、模型名为空。
- 明确的内容策略拒绝。
- 服务成功响应但业务内容不符合用户预期。

Backup 未启用或配置不完整时，Primary 仍可独立工作；错误响应明确标记“无可用备用模型”。不做重试风暴：每个槽位每次用户操作只调用一次。

## 7. 本地 API

保留 `POST /api/chat`，响应扩展为：

```ts
interface RoutedChatResponse {
	message: string
	model: string
	slot: 'primary' | 'backup'
	provider: 'ollama' | 'openai-compatible'
	preset: 'ollama' | 'aibuff' | 'openai' | 'custom'
	fallback?: { from: 'primary'; reason: string }
}
```

新增：

- `GET /api/model-routing`：返回脱敏后的两个槽位、环境变量覆盖状态和密钥是否存在。
- `PUT /api/model-routing`：校验并原子保存两个槽位及显式密钥操作。
- `POST /api/model-routing/test`：测试指定槽位，只发送固定的最小文字消息，不附画布数据。

配置接口只在现有 loopback Express 服务上提供。所有响应与日志必须经过统一脱敏器，移除 Authorization、API Key、截图 Data URL 和可能带凭据的 URL。

## 8. 侧栏 UI

右侧面板增加“模型路由”区域，使用已确认的完整配置布局：

- 顶部展示 `Primary → Backup`，提供“一键交换顺序”。
- 两张配置卡均显示预设、Base URL、模型、API Key、超时和启用状态。
- API Key 默认掩码；留空保存执行 `retain`，另设明确的“清除密钥”。
- 每张卡提供“测试连接”，并显示连接中、成功或可读失败状态。
- 未保存的修改显示 dirty 标记；保存成功后清除。
- 环境变量覆盖字段显示来源且不可编辑。

聊天执行期间显示当前调用槽位。发生 fallback 时显示脱敏原因；成功后显示实际 provider 与模型。认证失败、模型不存在、限流和无备用模型使用不同的可操作提示，但不展示密钥、完整请求正文或截图。

现有“Send to Ollama”文案改成厂商无关的“Send to model”；生成修订版仍使用成功的聊天回复作为 ComfyUI prompt，不改变画布落图行为。

## 9. 错误模型与日志安全

服务内部使用结构化 `ProviderError`，至少包含：

- `kind`: `network | timeout | rate_limit | server | auth | invalid_request | model_not_found | policy | malformed_response | config`。
- `status`：可选 HTTP 状态码。
- `safeMessage`：可展示给用户的脱敏消息。
- `retryable`：仅用于路由判断，不由字符串匹配决定。

原始 provider 响应只在内存中用于分类，不原样写日志。日志允许记录时间、槽位、预设、模型、耗时、状态码和错误类别；禁止记录 Authorization、API Key、完整消息、shape JSON、截图 Data URL及带查询参数的 URL。

## 10. 测试策略

### 10.1 单元测试

- 配置 schema、默认值、Base URL 规范化和非法 URL 拒绝。
- 环境变量覆盖本地文件及现有 Ollama 环境变量兼容。
- 密钥 `retain`、`set`、`clear`，脱敏读取与原子写入。
- Ollama 和 OpenAI-compatible 的文字、多模态请求格式。
- ProviderError 分类及 fallback 判定。
- 日志与 API 错误对象的密钥、Authorization、Data URL 脱敏。

### 10.2 集成测试

使用本地 mock HTTP server，不使用真实 API Key：

- Primary 成功，不调用 Backup。
- Primary 网络失败、超时、429、5xx 后 Backup 成功。
- Primary 400、401、403、404、422 时不调用 Backup。
- Primary 与 Backup 均失败时返回两个安全错误摘要。
- Backup 未启用时 Primary 正常工作。
- 配置保存、服务重建及重启恢复。
- 配置测试接口不发送画布截图或 shape 数据。

### 10.3 Renderer 与 Electron 测试

- 两张配置卡、交换顺序、dirty 状态和保存反馈。
- 密钥仅显示“已配置”，空输入不覆盖，清除需要明确操作。
- 环境变量字段只读。
- 聊天过程中显示当前槽位、fallback 原因和最终模型。
- Electron utility process 收到正确配置目录；BrowserWindow 不获得磁盘密钥。

CI 全部使用 mock server，不依赖 Ollama、AIBuff 或任何云端凭据。

## 11. 人工验收

1. 仅启用 Ollama，完成现有选中对象、画布截图、模型回复流程。
2. 使用 AIBuff 或另一 OpenAI-compatible 端点完成一次文字请求。
3. 使用同一云端端点完成一次包含画布截图的请求。
4. 人为让 Primary 返回可 fallback 错误，确认自动切换 Backup 并显示原因。
5. 人为设置错误 API Key，确认显示认证错误且不切换 Backup。
6. 重启 Electron，确认普通配置与密钥状态恢复，UI 不显示明文密钥。
7. 不配置云端密钥，确认纯本地 M1 闭环不受影响。
8. 检查仓库、日志、画布 JSON、导出内容与打包产物，不含用户密钥。

## 12. 迁移与兼容

首次启动且没有模型路由配置时，从现有 `OLLAMA_BASE_URL`、`OLLAMA_MODEL` 生成内存中的默认 Primary，不强制立即写文件。用户首次保存侧栏配置后再创建配置文件。

`POST /api/chat` 的请求体保持兼容；现有 Renderer 可以在服务端改造后继续工作。响应保留 `message` 与 `model`，新增路由元数据，因此不会破坏现有调用方。

浏览器开发模式、Electron 开发模式及打包模式继续共用同一 Express API 和聊天路由。ComfyUI、画布持久化和 `AIImageHolder` 均不迁移。

## 13. 完成标准

- Ollama 与任意 OpenAI-compatible 端点均通过统一 `/api/chat` 工作。
- AIBuff、OpenAI、Ollama和自定义预设可保存、测试和切换。
- Primary/Backup 顺序可配置，fallback 严格遵守已批准错误范围。
- 文字与画布截图多模态请求均可工作。
- 密钥不进入仓库、URL、日志、画布数据、asar 或 Renderer 的读取响应。
- 重启后配置恢复，环境变量覆盖行为清晰可见。
- 未配置云端时，现有 Ollama + ComfyUI M1 闭环无回归。
- 自动测试、构建和三平台 CI 通过；人工验收步骤记入 `PROGRESS.md`。
