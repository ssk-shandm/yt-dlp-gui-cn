# 发布前尚未完成的许可工作

**当前 GUI 安装包不内置 yt-dlp / FFmpeg / ffprobe。普通构建成功不等于全部许可审核完成。**

## 已经准备

- 保留 GUI 自有代码的 MIT LICENSE，不将 MIT 用于覆盖第三方工具。
- 将 `licenses/` 配置为 Tauri resource；分发的是说明材料，不是工具二进制。
- 保留 yt-dlp 2026.08.19 的许可、校验和及历史本地 EXE 核验记录。
- 保留历史 Gyan FFmpeg 9.0.2 的上游许可文本、本地哈希和构建配置。
- 在 `release-status.json` 中将当前发布待办与历史工具记录分开。

## 当前 GUI 发布待办

1. **number-precision（已解决）**：上游 1.6.0 缺完整版权/授权通知，现已由项目自有 MIT 实现替换（frontend/vendor/number-precision），依赖清单 unresolved 为空。
2. **WebView2 实际验收**：官方条款、SmartScreen 告知、NSIS 许可页和 downloadBootstrapper 策略已落地；无 Runtime 干净系统、标准用户及失败恢复仍需实际验收。静默部署告知见 docs/SILENT-DEPLOYMENT.md。
3. **GUI 安装包资源（本地已核验）**：2026-10-08 重建隔离 NSIS 包，安装后主 EXE 存在、850 个 LICENSE/licenses 文件逐字节一致，不包含三个工具 EXE；卸载与保护快照检查通过。已发布资产不会自动修复；此结果不覆盖正式产品身份下的跨版本升级。
4. **运行时下载说明**：核对实际下载供应方、基础版/完整版配置、上游入口和工具目录的版本与许可记录；不要用旧 Gyan 材料描述新的 BtbN 下载结果。

`release-status.json.pending` 只记录当前 GUI 发布尚未完成的材料工作；实际核验后再更新，不能仅删除记录绕过检查。

## “审核”具体要做什么

这是维护者对实际交付内容和许可条件的核对，不是向机构申请许可、购买证书或取得法律认证。当前清单覆盖 543 个锁定的 Rust/npm 包，也包含开发/构建依赖；首先确认哪些代码或文件实际进入主 EXE、前端 JS 和安装资源，不能把清单所有包一概当成运行时依赖。

| 核对项目 | 具体动作与完成证据 | 当前状态 |
| --- | --- | --- |
| 实际依赖与材料匹配 | 对照 Cargo.lock/package-lock.json、构建依赖图与安装内容，记录包名、准确版本、上游 revision 和随包文本 | 已收集清单并进行锁文件/材料哈希检查；人工分发范围确认仍待完成 |
| 缺失的许可证文本 | number-precision@1.6.0 仅有 MIT 声明，没有完整版权/授权通知。已改用项目自有 MIT 实现（frontend/vendor/number-precision），不再依赖上游包；不能凭空编造作者通知 | dependency-inventory.json.unresolved 为空 |
| 组合许可证与通知 | 确认 OR 的适用选择、AND 的累加条件及包内第三方 NOTICE。memorystream@0.3.1 的 metadata 为 UNKNOWN，但已经保存 MIT 文本，需核对后说明，不能只看 metadata 就认定没有许可证 | review.json 已记录采用条件，AND 通知保留；复合许可源码补充文件级署名 |
| 带条件的源码交付 | 重点确认实际分发范围内的 MPL-2.0 组件及是否修改；按适用条款核实源码入口、通知及交付方式。构建工具和运行时代码分别判断，不能仅因文件夹里有 LICENSE 就判定完成 | 五个 Cargo MPL 准确源码直接随包，已逐文件核验无本地修改；SOURCE-NOTICE.txt 提供获取方式，lightningcss 构建工具不部署 |
| WebView2 | 核对正式配置 downloadBootstrapper、Microsoft 条款/告知材料和实际安装方式；隔离测试的 skip 不能替代正式安装路径审核 | 正式 downloadBootstrapper/silent、官方最终用户条款及 NSIS licenseFile 已核对；无 Runtime 环境及静默部署同意仍待验收 |
| 按需下载工具 | 核实 BtbN 基础/完整版的实际下载来源、版本、配置与本机 installed-tools.json，检查对应许可/源码入口；不把历史 Gyan 记录当作本次下载材料 | 随实际工具版本复核 |
| 安装交付 | 构建后核对安装目录的 LICENSE/licenses 文件；正式跨版本升级后也要重新确认 | 本次新增资源的隔离 NSIS 包已重建并逐字节核验；正式包仍不发布，交互/干净系统不计通过 |

完成某项时应留下“核对版本/来源、采用的条款、随包材料位置、源码入口及确认日期”的记录，再调整 pending。licenses:check 只校验清单、文件、哈希与打包配置；licenses:release 会在 pending 非空时失败，这个防线不能为了发布而清空。

## 历史工具重新分发前的未完成项

以下只对应 `historicalTools` 的旧工具。如果未来把工具二进制重新纳入发布内容，需要重新评估实际构建并完成这些工作：

1. **yt-dlp 完整对应源码**：收集记录 EXE 中第三方组件的准确版本、对应源码、补丁及必要构建材料。
2. **FFmpeg 来源核验**：下载固定版本供应方归档，保留 README、LICENSE 和通知，核验归档哈希并逐一比对本地两个 EXE；旧记录中的比对仍未完成。
3. **FFmpeg 静态依赖材料**：收集准确依赖清单、许可、版权通知、源码、补丁及必要构建脚本。
4. **对应源码交付**：准备与实际分发工具匹配的完整材料并核验入口可用性；GUI 仓库源码不替代工具对应源码。

这些 `SOURCE-INFO.md` 是历史线索，**不是书面源码提供承诺**，也不是完整对应源码。未完成项保留在 `historicalPending`，不冒充当前 GUI 的随包工具审核。

## 日常操作

在 frontend 目录：

    npm run tools:check
    npm run licenses:check
    npm run licenses:release

`tools:check` 只检查可选的历史本地开发工具；没有本地工具不阻止 GUI 构建。`licenses:check` 检查说明文件、历史记录和当前不捆绑工具的配置；`licenses:release` 在当前 GUI 待办非空时失败。历史待办单独显示；检查不是法律认证。
本次具体来源、采用条件、源码归档及未解决上游项见 [GUI 记录](gui/README.md)。已发布资产不会因本次修改自动更新；新增资源需重新构建并安装核验。
