# 耳畔 · erpan

**在手机上和 AI 语音通话，不占住你的屏幕。**

耳畔是一款免费开源的 Android 语音客户端。你可以一边玩游戏、看小说，一边和聊天前端里的 AI 说话；也可以关闭麦克风，只听它的回复。

[下载](https://github.com/qfyingque/erpan/releases) · [使用说明](使用说明.md) · [开发接入](开发接入.md) · [更新说明](CHANGELOG.md) · [隐私](PRIVACY.md)

## 能做什么

- 后台语音通话、悬浮球开关麦、开口打断、确认后发送。
- 只听回复：在所选 Operit 聊天中打字，耳畔接收新回复并朗读。
- 识别与合成分别配置；保存多套声音方案，结束通话后切换。
- 云端语音与电脑上的本地语音服务，包括兼容网关后的 Qwen3-TTS / IndexTTS2。
- ElevenLabs 官方语音接口：Flash v2.5 文字流接入和 v3 分段合成。
- 悬浮字幕、可选头像和游戏声音共存。
- 本次新增：字幕跟随实际播放段落、Moss 三种朗读方式。

**当前准备发布：0.3.23-preview / code54。** 基于 code53 功能，更新公开文档与分发材料。字幕跟随已获用户实机试用认可，Moss 新模式仍待试听，见 [验证范围](VERIFICATION.md)。

## 免费开源与语音费用

耳畔代码使用 MIT 许可证，安装耳畔不收取费用。聊天、识别、语音合成使用你自行配置的服务：云端额度和费用以服务商为准，本地模型需要自行部署。开源包不附赠 API Key、语音额度、模型权重或私人克隆音色。

## 第一次使用

1. 安装耳畔 APK，并在 Operit 中确认文字聊天正常。
2. Operit → 工具 → 包管理 → ＋，导入随包的 `phone10-mobile-voice.js`，启用并运行 `setup`。
3. 在耳畔「连接配置」选择聊天，填写识别、合成和声音信息，保存。
4. 回首页开始通话；只想听回复时选「只听回复」，无需配置识别。

从早期版本升级时，APK 和配套脚本都要更新。具体步骤见 [使用说明](使用说明.md)。

## 接入其他前端或模型

当前提供 Operit 适配。不同聊天前端需要各自实现“发送消息、接收回复、完成/取消”的适配；参考本项目源码，不是填一个地址就能接所有前端。

语音模型也需要匹配接口。原生支持的云服务可直接配置；自建模型需要实现 Audio API PCM 接口或本项目的本机 WSS 合同。完整服务端模型/网关不在本仓库内，见 [本地语音接入](LOCAL-TTS-接入说明.md)。

流式能力随后端不同：支持持续追加文字的服务可在一次任务内接收后文；Moss 和本地客户端分段会按段提交，音频随后流式返回。整条模式等回复结束才开始合成。

## 编译

Android 8.0 及以上；构建使用 JDK 21、Android SDK 36、Gradle Wrapper 9.1.0，插件测试使用 Node.js 22+。首次构建需联网下载依赖。

```powershell
.\gradlew.bat :mobilevoice:testDebugUnitTest :mobilevoice:assembleDebug :mobilevoice:lintDebug
node --test tests/*.test.mjs
```

产物：`mobilevoice/build/outputs/apk/debug/mobilevoice-debug.apk`。本次为同签名预览 APK；自行编译的签名通常不同，不能直接覆盖维护者的安装包。详见 [开发说明](CONTRIBUTING.md)。

保留 [MIT 许可证](LICENSE) 中的 Erpan / LiveKit 署名及 [第三方声明](THIRD_PARTY_NOTICES.md)。语音模型、音色、Operit 与云服务各自的许可和条款独立适用。
