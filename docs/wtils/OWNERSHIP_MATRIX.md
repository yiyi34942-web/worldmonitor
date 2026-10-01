# OWNERSHIP_MATRIX（Phase 0 最终冻结版）

> Owner：Grok Bot　日期：2026-10-01（Asia/Shanghai）　基线：`WM_UPSTREAM_BASELINE=0c4d9438b0c122cb5c6a54b67b47dde51c5aaddc`　分支 `wtils/phase0`　本地提交，未 push
> **取代**旧 staging 版（`…/grok-jobs/wtils-chief-orchestrator/phase0-staging/docs/wtils/OWNERSHIP_MATRIX.md`）与更早的 `…/wtils-chief-orchestrator/OWNERSHIP_MATRIX.md`，二者保留不动、已作废。
> 本文依据用户 Q7、Q8 最终裁决（权威）。所有校验均在基线的真实文件树（`git ls-files`，7602 个 tracked 文件）上运行。

## 1. 冻结所有权

### 1.1 GLM OWNER（Registry / 契约 / 静态校验 / 独立 reviewer）
| Glob |
|---|
| `wtils/config/registries/**` |
| `wtils/schemas/registries/**` |
| `wtils/schemas/research/**` |
| `wtils/scripts/registries/**` |
| `wtils/tests/registries/**` |
| `wtils/docs/registry/**` |
| `wtils/docs/methodology/**` |
| `wtils/docs/profile/**` |
| `wtils/docs/contracts/**` |

职责：8 Registry、Five Role、31 Methodology（`WTILS_METHODOLOGY_REGISTRY_V1`）、10 Profile、API 静态契约（A00–A22）、Source/Delivery/Lifecycle 语义、Research Artifact Schema。不污染 upstream 顶层 `scripts/`、`tests/`。

### 1.2 GROK BUILD OWNER（Docker/Runtime/Router/集成/NAS/acceptance）
| Glob |
|---|
| `wtils/**`（**GLM 路径优先，见 §2**） |
| `src/wtils/**` |
| `deploy/wtils/**` |
| `docker/wtils/**` |
| `scripts/wtils/**` |
| `tests/wtils/**` |

职责：Docker/Compose（参数化）、Runtime、Router 实现、adapters、API live invocation（A23–A24 的证据）、MCP/REST、Output 集成、NAS 抽象、acceptance 脚本。**禁止修改 GLM 拥有的 registry/methodology/contract**；发现错误只能 `STOP_AND_REPORT_CONTRACT_CONFLICT`。

### 1.3 GROK BOT（Buildbot：验收/闸门/仲裁/合并建议）
| Glob |
|---|
| `docs/wtils/PHASE0_*.md` |
| `docs/wtils/OWNERSHIP_MATRIX.md` |
| `docs/wtils/EXECUTION_ORDER.md` |
| `docs/wtils/AIR_LEGACY_RUNTIME_INVENTORY.md` |
| `docs/wtils/acceptance/**`（验收文档目录，名称为 Bot 提议） |

位置说明：Phase 0 三份文档放在 **`docs/wtils/`**（用户最初指定位置）。`docs/wtils/` 与 `wtils/docs/` 是两个不同目录：前者仅 Bot 的文档，后者属 GLM（registry/methodology/profile/contracts 子目录）与 Grok Build（其余子目录，如 `wtils/docs/audit/`）。

### 1.4 其他
- **Codex**：本阶段及后续指定阶段均不参与。
- **未列入任何 Owner 的路径 = `READ_ONLY_BY_DEFAULT`**：所有 upstream 既有文件（7602 个）、`docs/wtils/` 下未列文件（如 `docs/wtils/README.md`）。
- **upstream 文件修改流程**：生成 `INTEGRATION_PATCH_REQUEST`（`file`、`reason`、`minimum_diff`、`alternative`、`rollback`），然后 **STOP 等用户批准**；批准前任何人不得写。

## 2. 优先级规则（解决 `wtils/**` 与 GLM 子路径的包含关系）

1. 若路径匹配任一 **GLM glob** → owner = **GLM**（GLM 优先，Grok Build 禁止修改）。
2. 否则若匹配 **Grok Build glob** → owner = **GROK BUILD**。
3. 否则若匹配 **Grok Bot glob** → owner = **GROK BOT**。
4. 否则 → **UNOWNED / READ_ONLY_BY_DEFAULT**。
Grok Bot 的 glob（`docs/wtils/…`）与前两者在路径前缀上不相交（`docs/wtils/` ≠ `wtils/docs/`）。

## 3. 基线真实文件树审计（脚本输出摘要）

方法：Python 脚本，glob→正则（`**` 跨目录，`*` 不跨 `/`），对 `git ls-files` 的全部 **7602** 个 tracked 文件逐个判定；另用 32 个样例路径验证唯一 owner；对 20 个 glob 做 190 对两两比较（以合成探针路径检测共同匹配）。

**(a) 每个 glob 命中的既有 tracked 文件数**：20 个 glob（GLM 9 + Grok Build 6 + Grok Bot 5）**全部 = 0**；任何位置含 `wtils` 的 tracked 路径 = 0。→ upstream 没有 `wtils` 目录，**无命中**，不需列出。

**(b) GLM 与 Grok Build 的两两交集**：
- 原始 glob 文本比较（无优先级）：190 对中 **9 对相交**，全部是 `GLM: wtils/<子路径>/**` ⊂ `GROK_BUILD: wtils/**`（包含关系）。
- 应用 §2 的 GLM 优先规则后：32 个样例路径（含 GLM 的 9 类、Grok Build 的全部 6 类、Grok Bot 5 类、未列 7 类）**有效 owner 均唯一**；**有效 owner 非唯一的探针 = 0**。
- 代表判定：`wtils/config/registries/r1/x.yaml`→GLM；`wtils/schemas/research/artifact.json`→GLM；`wtils/scripts/registries/validate.py`→GLM；`wtils/runtime/a.py`→GROK_BUILD；`wtils/docs/audit/x.md`→GROK_BUILD；`wtils/config/other.yaml`→GROK_BUILD（`wtils/config/` 下非 `registries/` 的归 Grok Build）；`wtils/tests/other.py`→GROK_BUILD；`docs/wtils/PHASE0_ARCHITECTURE_FREEZE.md`→GROK_BOT；`docs/wtils/README.md`→UNOWNED。
- 结论：**在"GLM 路径优先"规则下无歧义；不带优先级规则则存在 9 对包含式重叠——因此该规则是冻结的组成部分，必须写入 `OWNERS` 类校验脚本。**

**(c) docker/deploy 碰撞审计**：upstream tracked 于 `docker/` + `deploy/` 共 **27** 个文件（`docker/` 26、`deploy/` 1）；其中位于 `docker/wtils/` 或 `deploy/wtils/` 的 = **0**；`wtils` 同名路径碰撞 = 0；Q8 只授权 `docker/wtils/**`、`deploy/wtils/**`，**不**授权整个 `docker/**`/`deploy/**` → 27 个 upstream 文件均 READ_ONLY；根 `docker-compose.yml` 与根 `Dockerfile*`（8 个）owner = UNOWNED。→ **无冲突**（上一版 X1 冲突已由 Q8 消除）。WTILS compose 放 `deploy/wtils/`，以多 `-f`/`include` 叠加 upstream 根 compose。

**(d) upstream 既有文件 `READ_ONLY_BY_DEFAULT` 计数**：**7602 / 7602**；落入任一 owner glob 的 upstream 文件 = **0**。

## 4. 共享边界与交接协议
| 边界 | 生产者→消费者 | 交接物 | 规则 |
|---|---|---|---|
| Registry schema/data → Router/Planner/Output | GLM → Grok Build | `wtils/schemas/registries/**`、`wtils/config/registries/**`、R7 版本号 | Grok Build 只读加载，不得手改或在实现里"修正解释"；schema 只增不改，破坏性变更须新 `schema_version` 并经 Bot 仲裁 |
| Research Artifact Schema → 持久化适配 | GLM → Grok Build | `wtils/schemas/research/**` | 适配层写入时按 schema 校验；时间契约强制（original_publish_time≠first_seen_time；空字符串 REJECT；缺失 null；PIT/RETRO 区分） |
| API 生命周期 | GLM（A00–A22）→ Grok Build（A23–A24 证据）→ Bot 验收 | 静态契约 / live 调用证据 | Grok Build 不得改 R5 状态；A23–A24 证据由 Bot 验收后交 GLM 回填；未测不得标 STATIC_VERIFIED 以上 |
| 契约错误 | 发现者 → Bot | `STOP_AND_REPORT_CONTRACT_CONFLICT` | 发现者停手，不改他人文件；报告含冲突双方文件:行、复现、影响面、建议；Bot 仲裁，重大事项升级用户 |
| upstream 变更 | Grok Build → 用户 | `INTEGRATION_PATCH_REQUEST` | 提交后 STOP，用户批准前不得改任何 upstream 文件 |
| 独立评审 | GLM 评审 Grok Build 对 Registry id 的引用；Grok Build 评审 GLM 的部署/存储假设 | 评审文本 | 评审者不写对方路径 |
| 验收闸门 | Bot → 全体 | `docs/wtils/acceptance/**` | 未过闸门不得进入下一阶段 |

`INTEGRATION_PATCH_REQUEST` 模板：
```
INTEGRATION_PATCH_REQUEST-<yyyymmdd>-<seq>
file:            <upstream 文件路径>
reason:          <为何无法在 wtils/ 内实现>
minimum_diff:    <最小 diff 大意或补丁>
alternative:     <不改 upstream 的替代方案及其代价>
rollback:        <回滚方式>
agents_md_check: <对照 AGENTS.md 的哪些约束；AGPL 影响>
STATUS: PENDING_USER_APPROVAL   # 在批准前一律 STOP
```

## 5. 禁止项汇总（所有 Owner）
- 不得写非自己 Owner 的路径；不得与他人写同一文件；不得自动派工。
- 不得写任何密钥/token/`.env` 内容/用户名绝对路径/固定 IP/主机名；示例用 `${WTILS_*}` 占位。
- 不得引入第二套 Dashboard/地图/新闻采集/AIS/通用 polling-cache-retry/Signal-Hotspot/独立 TIS Web UI；旧 TIS 不再新开发；Bypass RETIRED；历史数据导入 RETIRED；外部数据默认 OFF；GODS_EYE_VIEW 不属于 WTILS Core。
- 不得启停/删除/迁移 Air 上任何 legacy 容器或进程；不得轮换 Air 密钥；不得从 Air 复制 production 凭据。
- 不得触碰 Obsidian、8092、Agent Client、DR.egg、WeKnora 数据。
- 修改版不得称为"官方 WorldMonitor"；保留 LICENSE/copyright/attribution。
