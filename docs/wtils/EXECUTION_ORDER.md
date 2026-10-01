# EXECUTION_ORDER（Phase 0 最终冻结版）

> Owner：Grok Bot　日期：2026-10-01（Asia/Shanghai）　基线 `0c4d9438b0c122cb5c6a54b67b47dde51c5aaddc`　分支 `wtils/phase0`　本地提交，未 push
> **取代**旧 staging 版（`…/phase0-staging/docs/wtils/EXECUTION_ORDER.md`，保留不动、已作废）。

## 1. 严格顺序
```
PHASE0 (Grok Bot) ─PASS ONLY→ PHASE1 (GLM) ─PASS ONLY→ PHASE2 (Grok Build) ─PASS ONLY→ PHASE3 (Grok Bot 独立验收)
```
硬规则：
1. 每阶段 **PASS ONLY** 才能进入下一阶段；PARTIAL/UNVERIFIED/BLOCKED 一律不进入。**OVERALL 不是 PASS 则不得进入 Phase 1。**
2. **禁止并行施工**：同一时刻只有当前阶段 Owner 在写。
3. **禁止 Runtime 抢跑**：PHASE1 PASS 前不得写 `src/wtils/**` 运行时/Router 代码，不得启动任何 WTILS 服务。
4. **禁止自动派工**：阶段切换与工作单下发均需用户明确批准；Bot 不自行联系 GLM/Grok Build/任何 bot。
5. 契约矛盾 → `STOP_AND_REPORT_CONTRACT_CONFLICT`；**任何命令被安全检查拒绝 → `STOP_AND_REPORT`，不得拆分、改写、换工具重试**（PROCESS_DEVIATION_001 的纠正）。
6. 不写密钥；不硬编码 `/Users`、`/Volumes`、固定 IP、主机名；外部数据默认 OFF；未测接口不得标 PASS；`MID_PHASE_UPSTREAM_UPDATE=FORBIDDEN`。
7. 每阶段回传物统一五项：**commit、changed files、tests、evidence、blockers**。

## 2. 各阶段

### PHASE0 —— 架构审计与冻结（Grok Bot）
| 项 | 内容 |
|---|---|
| 入口 | 用户 Q1–Q10 最终裁决（已有，2026-10-01） |
| 交付物 | `docs/wtils/PHASE0_ARCHITECTURE_FREEZE.md`、`OWNERSHIP_MATRIX.md`、`EXECUTION_ORDER.md`、`AIR_LEGACY_RUNTIME_INVENTORY.md` |
| 验收证据 | 基线核验（hash=origin/main HEAD）；真实文件树 ownership 审计；docker/deploy 碰撞审计；repo audit；只读 Air inventory；secret 扫描；无 Runtime 写入证明 |
| 回传物 | commit：见本分支唯一一次提交；changed files：docs/wtils/ 下 4 个新增；tests：无代码测试，审计脚本输出；evidence：见上；blockers：OPEN_ACTION（均 NON_BLOCKING_FOR_PHASE0） |
| PASS ONLY | 文档完整、无编造、无重叠、基线一致、无密钥、无 Runtime 写入。**注意**：OA-1（用户 fork 未创建）不阻塞文档类 PASS，但阻塞"以用户 fork 作运行源码基线"的最终落地；是否因此给 Phase 0 OVERALL 降级，见回报中的 Bot 判定 |

### PHASE1 —— Registry 与契约（GLM）
| 项 | 内容 |
|---|---|
| 入口 | PHASE0 PASS；用户批准下发 |
| 范围 | 仅 GLM glob（`wtils/config/registries/**`、`wtils/schemas/registries/**`、`wtils/schemas/research/**`、`wtils/scripts/registries/**`、`wtils/tests/registries/**`、`wtils/docs/{registry,methodology,profile,contracts}/**`） |
| 交付物 | 8 Registry schema+数据；5 Role；`WTILS_METHODOLOGY_REGISTRY_V1` 的 31 条（M01–M24 + C01–C07）逐条映射 `OFFICIAL_DIRECT / OFFICIAL_COMPOSITE / WTILS_GOVERNANCE`；10 Profile；API 静态契约 **A00–A22**；Source/Delivery/Lifecycle 语义；Research Artifact Schema；词表差异方案（FREEZE §2.4 X3）；静态校验器与测试 |
| 验收证据 | 校验与测试完整命令+输出；计数断言（Role=5、Profile=10、Methodology=31=24+7、Registry=8）；时间契约负例被拒；无未测 PASS；零硬编码/零密钥扫描 |
| PASS ONLY | Bot 干净检出独立复跑一致；`git diff` 全部落在 GLM glob；映射由 GLM 定稿（Bot 初判仅供参考）；R7 版本号冻结 |

### PHASE2 —— 部署与运行时（Grok Build）
| 项 | 内容 |
|---|---|
| 入口 | PHASE1 PASS；Registry 版本冻结；用户批准下发 |
| 范围 | 仅 Grok Build glob；upstream 文件一律 READ_ONLY，需改 → `INTEGRATION_PATCH_REQUEST` 并 STOP |
| 第一项交付 | persistence audit 与 Dedicated Research Store 判据（Bot 认可后才可写持久化适配代码）；Redis 7.2.x pin 方案（exact tag + digest，部署时定） |
| 交付物 | `deploy/wtils/**` 参数化 compose；runtime；Router/Planner；adapters；API live invocation（**A23–A24 证据**，外部数据默认 OFF）；MCP/REST；Output Router；NAS 抽象（只依赖 abstract contract）；`scripts/wtils/**` / `tests/wtils/**` acceptance 与测试 |
| PASS ONLY | Bot 独立复跑；零越界写入；`WTILS_NODE_ROLE=DEV` 不能进入生产模式；NAS 降级策略有实现与测试；Mac mini 生产凭据全新生成（Q5）；无第二套 Dashboard 等 |

### PHASE3 —— 独立验收（Grok Bot）
| 项 | 内容 |
|---|---|
| 入口 | PHASE2 PASS |
| 验收项 | Hormuz/Crude Energy E2E（M16/M20/M15/M03/M21 → API Plan → Fast Report → Timeline → Evidence Graph → δT → Market Impact → PIT Replay → Event Backtest → Promotion）；时间契约负例；PIT 与 RETROSPECTIVE_RECALCULATION 区分；API 状态机；NAS 故障注入；Air 不作生产检查；迁移演练（需第二台机器）；范围检查（含 AGPL：LICENSE/attribution 未删、产品名未冒称官方） |
| PASS ONLY | 全部 PASS；任何 PARTIAL/UNVERIFIED 为阻塞；最终合并建议由 Bot 提出，合并/推送由用户执行或批准 |

## 3. 前置依赖
| 等待方 | 依赖 | 来源 |
|---|---|---|
| 用户 fork 作为运行源码基线 | OA-1：创建 fork + 设 remote（需用户明确授权） | 用户 |
| Phase 1 完整 | 词表差异方案（OA-7） | GLM 提出，用户/Bot 确认 |
| Phase 2 持久化 | persistence audit 获认可 | Grok Build → Bot |
| Mac mini 实机 | OA-2/OA-3/OA-4（硬件、NAS、WeKnora/OpenMAIC 镜像） | 用户 |

## 4. 本阶段结论
Phase 0 文档与审计已完成并本地提交；未联系 GLM/任何 bot；未进入 Phase 1。**NEXT=STOP**。
