# ElevenLabs 接入普通耳畔

本版提供 ElevenLabs 合成服务。保留已有云端和本机声音方案、识别服务、聊天绑定、字幕确认发送和头像功能。平台额度与音色API权限以当前账号为准；验证范围见 VERIFICATION.md。

## 注册与设置

1. 打开 https://elevenlabs.io/app/sign-up 。Google 是快捷登录方式；也可用普通邮箱注册。密码、验证步骤和服务条款由账号本人完成。先用免费档试听，不需要为安装接口而订阅。
2. 注册后在 ElevenLabs 平台选择能使用的声音，复制 Voice ID。不是声音显示名，也不是试听网址；本次可以直接试官方声音，无需克隆或上传参考音频。
3. 在平台 Developers / API Keys 创建具有 Text to Speech 合成权限的 API Key；这是独立于模型聊天和语音识别的密钥。不要放进群、截图、日志或源码。免费可用额度和具体音色权限以账号当前控制台为准。
4. 安装本包后，在耳畔声音方案中另存一个新方案，合成服务选 ElevenLabs，地址保持 https://api.elevenlabs.io/v1 ，填写 API Key、Voice ID 和自定声音名称。识别和聊天设置继续用原配置。
5. 选择 Flash v2.5（边写边说）或 v3（分段朗读）。同一个声音可分别保存两套方案，方便比较。点击检查连接会产生一条短句合成，消耗平台额度，但不会播放或发送聊天消息。
6. 最后以手机实际听到短句、长回复、两次连续回复和停止后无残留为验收。构建或模拟接口测试不能证明账号已可用。

## 两条合成路线

- Flash v2.5：官方 TTS WebSocket 接收陆续到来的文字，回传 Base64 PCM。首条空格初始化、末条空字符串结束，工具等待期间空格保活；一条回复独立连接，结束后关闭。平台仍会缓冲文字，不能承诺首字立即出声。
- v3：官方 HTTP stream，每段完整文字一个请求，输出音频流。复用既有 SentenceSpeech 排队和有限预取、统一播放器；不是把 v3 冒充成该 TTS WebSocket 的支持模型。各段独立生成，音色和语气衔接需试听。
- 两者输出均固定 pcm_24000，24 kHz 单声道 PCM16LE，复用当前播放器。取消会取消当前请求/连接并清空原播放链；客户端不重试已提交文本、不切到其他付费平台。
- 新版 ElevenLabs 另有 Text to Dialogue 等接口；本版按用户批准方案仅接上述 TTS 路线。

接口仅接受官方 https://api.elevenlabs.io/v1 基址。密钥用 xi-api-key 请求头，不放在 URL 或 WebSocket 消息正文。错误只展示固定提示/HTTP 状态，不转发远端原始响应或凭据。Key 用耳畔既有加密设置保存。

## 长度与等待

Flash 当前一轮文字上限 40000 Unicode 字符；v3 单次 HTTP 段上限 4000，正常聊天通过已有分句队列提交。音频每次请求/连接上限 30 分钟。它们是客户端传输限制，不保证模型达到这些长度时的听感或账号额度。HTTP 沿用当前 30 秒读取等待和 90 秒请求总限；Flash 总限 30 分钟，15 秒保活，服务端 inactivity_timeout=180。失败不会重播或静默漏读。

## 官方依据（2026-09-26 核对）

- https://elevenlabs.io/docs/api-reference/text-to-speech/stream
- https://elevenlabs.io/docs/api-reference/text-to-speech/v-1-text-to-speech-voice-id-stream-input
- https://elevenlabs.io/docs/eleven-api/guides/how-to/websockets/realtime-tts
- https://elevenlabs.io/docs/overview/models

复用项目现有 OkHttp、Gson、协程和 Android 播放器，没有新增依赖。官方示例主用 JS/Python SDK；Android 已有这些基础库，直接实现两条文档协议比引入跨语言服务或新的 SDK 更少维护。ElevenLabs 服务本身为闭源付费/额度服务，客户端接入不赋予模型或音色的其他许可。
