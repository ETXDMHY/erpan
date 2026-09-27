# 本地语音：Qwen3-TTS / IndexTTS2

耳畔运行在手机上，模型部署在你自己的电脑或服务器。请选择与服务相符的协议：Audio API PCM 或「本机语音」WSS。**模型原生接口不一定直接兼容；本包不包含模型服务端和完整网关。**

## 配置

填写你自己的可信WSS地址、独立Bearer密钥、model和voice。示例地址：
`wss://voice.example.com/v1/audio/speech/stream`。

每个声音使用服务注册的真实voice ID。参考录音与模型参数留在服务端；手机只保存连接和声音选择。旧provider内部名称qwen-local继续兼容。

## WSS 合同

同一主机提供：
- `POST /v1/audio/activate`：Bearer鉴权，取得lease_id。
- `GET /health`：ready、low_latency_ready、named_voices；Index另校验busy=false和restart_required=false。
- `GET /v1/audio/voices`：认证目录，包含model、id、name、ready、supported_modes。
- `POST /v1/audio/release`：提交原lease_id。手动off返回423，不被手机自动唤醒。

每段独立WS，按序发送：
```json
{"type":"session.config","model":"indextts2","voice":"your-registered-voice","split_granularity":"none","stream_audio":true,"response_format":"pcm"}
{"type":"input.text","text":"这一段要朗读的文字。"}
{"type":"input.done"}
```

返回audio.start、二进制PCM、audio.done、session.done；需校验格式、字节数、索引、错误和完整结束。输出固定24000Hz、mono、PCM16LE，无WAV头。其他原生采样率必须真正重采样。

Index客户端每请求最多600 Unicode码点，Qwen本机路径按现有2000码点边界校验；不拆代理对。实际模型容量另由服务规定。

## 首句先读、整段与声音切换

Index首句先读由手机按首标点及后续有限长度分段，每段input.done后才启动该段合成，再流式回传音频。整段等整条回复写完；工具等待不算完成。服务声明支持的模式决定能否使用，不自动回退到其他模式或声音。

租约覆盖本条回复所有分段及实际播放，播放器排空后release。停止先清空播放器与旧回调、取消WS，再确认服务可接新任务；取消连接不等于GPU已经退出。

结束通话 → 声音方案 → 刷新声音列表 → 选择可用声音并保存 → 再开始通话。当前不支持通话中热切声。目录失败不删除已保存方案，ready=false不当作可用，不自动切付费云端。

服务端应验证短长句、取消后下一条、尾音和声音路由；手机还需独立验证实际播放与网络切换。
