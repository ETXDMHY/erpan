# 只听回复增量播放：code30

## 交付

`0.3.18-listen-stream.1`，versionCode 30。升级需 APK 与同包 `operit/phone10-mobile-voice.js` 一起更新。不需要更换 O 客户端或重载电脑后台。保留聊天、语音配置和原有语音通话。

## 实现

- `observe_stream` 为只读同步快照协议，旧 `observe` 原样兼容。复用 MAIN 状态和原生官方历史读取 helper。
- O 1.12.1 普通聊天生成时约每秒保存正文，耳畔在上一次读完后间隔 500 ms 再读；不是逐 token 网络订阅。未保存生成中正文的 O 路径只能在可读正文出现后朗读。
- `ReplyListener` 按实际消息时间戳计算可读增量，一条回复一个连续 channel，复用 `VoiceConversation` 的分段/TTS/字幕。最终快照补尾并关闭，历史不重播；正文前缀改写时停止该条并提示；手动停止抑制当前回合后续片段，绝不取消 O 的生成。

## 本轮验证 2026-09-15

- JVM 173 tests / 0 failures；JS 32 pass / 2 历史非现役 worker tests skipped；assembleDebug 成功，APK 签名与 code29 一致。
- 首次 JVM 全套中旧 `OperitScriptDispatchTest.saturatedWorkersRejectInsteadOfQueuingStaleSpeech` 在第二次 submit 出现线程池交接竞态；`Future.get` 完成早于 worker 回到 SynchronousQueue。该非现役路径没有修改；最终完整重跑通过。保留首轮失败记录，不把重跑通过说成消除了旧竞态。
- 小米已覆盖安装 code30，配套插件磁盘/内存比对、备份、刷新与 `usePackage` 成功；Sol/yy1/只听选择保留。手机开启只听，新测试仅发送一次，用户确认正在出声。
- 同机时钟校准：first PCM monotonic 1627868251 ms → wall 1789470372144.9385；O 该条 `completedAt` 1789470386816。首段 PCM 早于正文完成 **14.671 秒**；1789470377467 的屏幕仍显示“正在接收AI响应”。
- 最终原文 632 字符（含换行），可读非空白 622 字符；25 次 Moss 请求字符数合计 622，无重复或缺字迹象。最后一次请求 25 字符、HTTP200、PCM 完成，播放器最终 `playback_drained` 1628023584 ms。用户未确认精确出声先后或逐字尾句，时序与完整性依据设备日志。
- 本次输出日志为设备类型 2（扬声器）；未另验耳机或麦克风。旧 code29 耳机验收是历史证据。本轮未改音频路由。

## 证据与恢复

交付目录 `维护者本地验证目录（不随包分发）`：`phone-timing.json`、`phone-playback-in-progress.txt`、`phone-playback-final.txt`、`PHONE-STATUS.md`、构建和测试日志。

手机旧插件备份同目录 `.before-listen-stream-20260915.bak`。旧 code29 APK/JS/源码包在兄弟目录 `erpan-listen-diagnostic-code28/`。Android 不接受普通降级时不要卸载或清数据；需要保配置恢复应以旧源码递增 versionCode 并使用同签名构建。

未改现役482c开发树，未发布 GitHub。未重载 Codex/Gateway、未开启主动唤醒。临时私网下载服务器已停止，手机已回 Sol 聊天页，只听保持开启。
