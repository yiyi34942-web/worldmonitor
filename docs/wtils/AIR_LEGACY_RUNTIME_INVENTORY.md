# AIR_LEGACY_RUNTIME_INVENTORY — MacBook Air 遗留运行态只读清单

> Owner：Grok Bot　采集时间：2026-10-01 约 21:15（Asia/Shanghai, UTC+8）　分支 `wtils/phase0`
> 状态声明（Q9）：`AIR_ROLE=DEVELOPMENT_ONLY`；`LEGACY_RUNTIME_PRESENT=YES`；`LEGACY_RUNTIME_STATE=FROZEN`；**`AIR_NOT_PRODUCTION=PASS`**。
> 本阶段**不停/启/删/迁/轮换/新建任何服务**。
> 采集方式（仅只读）：`docker ps`（`--format` 仅取 名称/镜像/状态/端口/挂载摘要）、`docker volume ls`、`lsof -iTCP -sTCP:LISTEN`。**未使用 `docker inspect`，未取任何环境变量/Env/启动参数；本文无环境变量值、无密钥。** 宿主机 bind mount 的具体路径被 Docker 输出截断，这里**只记录数量**，不记录路径。
> 主机：dengyideMacBook-Air.local（arm64，Mac17,4，16 GiB）。LAN 绑定地址一律写作 `<LAN-IP>`（不记录具体地址）。

## 1. 容器（运行中 26 个；含已停止共 35 个）

| # | 容器名 | 镜像 | 状态 | 宿主端口映射 | 挂载 |
|---|---|---|---|---|---|
| 1 | wm-task-redis-rest-20260925 | 881dbd339093（本地 redis-rest 代理） | Up 5 days | 127.0.0.1:18079→80 | 0 |
| 2 | wm-task-redis-20260925 | e7723ff73d96（Redis） | Up 5 days | 127.0.0.1:16379→6379 | 1 个命名卷 `wm-task-redis-data-20260925` |
| 3 | tis-local-integration-stage-20260924 | 6a56c6b27b92 | Up 5 days | — | bind×5 |
| 4 | tis-local-openmaic-stage-20260924 | postgres:17-alpine | Up 7 days | 127.0.0.1:49511→5432 | 命名卷 `tis-local-openmaic-stage-20260924-data` |
| 5 | trading-intelligence-dashboard | trading_intelligence_system-dashboard | Up 2 weeks | *:8082→8080 | bind×21（输出截断，数量按显示项计） |
| 6 | trading-intelligence-architecture | trading_intelligence_system-architecture-worker | Up 13 days (healthy) | — | bind×3 |
| 7 | ti-tencentdb-official-memory-core-1 | ti-tencentdb-core:v2.0.1 | Up 2 weeks (healthy) | 127.0.0.1:8420→8420 | bind×2 |
| 8 | trading-intelligence-db | pgvector/pgvector:pg16 | Up 3 weeks (healthy) | *:5432→5432 | bind×1 + 命名卷×1 |
| 9 | trading-intelligence-vikunja | vikunja/vikunja:2.6.0 | Up 3 weeks (healthy) | 127.0.0.1:3456→3456；`<LAN-IP>`:3456→3456 | bind×2 |
| 10 | book-searcher | book-searcher:local | Up 4 weeks (healthy) | 127.0.0.1:7070→7070 | bind×1 |
| 11 | ti-tencentdb-official-memory-hub-1 | ti-tencentdb-hub:v2.0.1 | Up 4 weeks (healthy) | 127.0.0.1:8125→8125；127.0.0.1:8424→8424 | bind×1 |
| 12 | ti-tencentdb-official-memory-proxy-1 | ti-tencentdb-proxy:v2.0.1 | Up 4 weeks (healthy) | 127.0.0.1:8096→8096 | bind×1 + 命名卷×1 |
| 13 | trendradar | wantcat/trendradar:latest | Up 4 weeks | 127.0.0.1:8088→8088 | bind×2 |
| 14 | trendradar-mcp | wantcat/trendradar-mcp:latest | Up 4 weeks | 127.0.0.1:3333→3333 | bind×2 |
| 15 | financial-news-system-rsshub-1 | diygod/rsshub:chromium-bundled | Up 4 weeks | 1200/tcp（未发布） | 0 |
| 16 | rsshub | diygod/rsshub:chromium-bundled | Up 4 weeks (healthy) | 127.0.0.1:1200→1200 | 0 |
| 17 | rsshub-redis | redis:alpine | Up 4 weeks (healthy) | 6379/tcp（未发布） | 命名卷 `rsshub_redis-data` |
| 18 | trading-intelligence-pipeline | ti-memory-retirement-pipeline:20260828 | Up 4 weeks | — | bind×8 |
| 19 | trading-intelligence-knowledge-acquisition | ti-memory-retirement-knowledge-acquisition:20260828 | Up 3 days | — | bind×5 |
| 20 | trading-intelligence-grobid | grobid/grobid:0.9.1-crf | Up 9 days | 127.0.0.1:8070→8070 | 0 |
| 21 | trading-intelligence-syncthing | syncthing/syncthing:latest | Up 4 weeks (healthy) | 21027/udp；127.0.0.1:8384→8384；22000/udp+tcp | 匿名卷×1 + 命名卷×1 + bind×1 |
| 22 | trading-intelligence-nitter | zedeus/nitter:latest | Up 4 weeks | 127.0.0.1:8788→8080 | bind×2 |
| 23 | trading-intelligence-nitter-cache | valkey/valkey:8-alpine | Up 4 weeks (healthy) | 6379/tcp（未发布） | 命名卷×1 |
| 24 | financial-news-system-freshrss-1 | freshrss/freshrss:alpine | Up 4 weeks | 127.0.0.1:8080→80 | 命名卷×2 |
| 25 | financial-news-system-postgres-1 | postgres:17-alpine | Up 4 weeks (healthy) | 5432/tcp（未发布） | 命名卷×1 |
| 26 | financial-news-system-redis-1 | redis:7-alpine | Up 4 weeks | 6379/tcp（未发布） | 命名卷×1 |

统计：运行 26 / 全部 35（`docker ps -q` / `docker ps -aq`）。含 Redis 家族镜像 4 种用法：`redis:alpine`（rsshub-redis）、`redis:7-alpine`（financial-news-system-redis-1）、`valkey/valkey:8-alpine`（nitter-cache）、WM 任务 Redis（镜像 id `e7723ff73d96`，具体版本 UNKNOWN，未 inspect）。**均为 legacy，不属于 Q4 的 Mac mini 基线**。

## 2. Docker 卷（共 19 个）

匿名卷（64 位十六进制名，仅记前 12 位）：`0d061127c08e…`、`11c4959f8160…`、`dc5a24618d26…`。
命名卷：`financial-news-system_freshrss_data`、`financial-news-system_freshrss_extensions`、`financial-news-system_postgres_data`、`financial-news-system_redis_data`、`rsshub_redis-data`、`ti-tencentdb-official_proxy-data`、`tis-fullcopy-go-buildcache`、`tis-fullcopy-go-modcache`、`tis-fullcopy-pnpm-store`、`tis-local-openmaic-stage-20260924-data`、`trading_intelligence_system_mlflow_artifacts`、`trading_intelligence_system_mlflow_data`、`trading_intelligence_system_nitter_cache`、`trading_intelligence_system_postgres_data`、`trading_intelligence_system_syncthing_config`、`wm-task-redis-data-20260925`。
全部 driver=`local`。

## 3. 宿主机监听端口（TCP LISTEN，进程名取自 `lsof`，已截断到 9 字符）

| 归类 | 进程 → 地址:端口 |
|---|---|
| Docker 发布（com.docker.backend） | `*:22000`、`*:5432`、`*:8082`、127.0.0.1:{1200, 16379, 18079, 3333, 3456, 49511, 7070, 8070, 8080, 8088, 8096, 8125, 8384, 8420, 8424, 8788}、`<LAN-IP>`:3456 |
| WorldMonitor 相关（node） | 127.0.0.1:46123、127.0.0.1:46124（WM sidecar 及其配套端口，**勿动**）；另有 node 监听 127.0.0.1:{47173, 47174, 49512, 49513, 49514}（用途 UNKNOWN，未识别） |
| Collection（`collectio…`） | 127.0.0.1:8092（**勿动**） |
| WeKnora（`weknora-s…`） | 127.0.0.1:18783（**勿动**；WeKnora 数据不碰） |
| Python | `*:8765`、127.0.0.1:{8090, 8091}、127.0.0.1:8767（`python3.1…`） |
| 其他 | `iii`：`*:49134`、127.0.0.1:{3211, 3212}；ControlCenter：`*:5000`、`*:7000`；DeepSeek 客户端 127.0.0.1:19387；DingTalk 127.0.0.1:{8440, 8451}；WeChat 127.0.0.1:{14013, 14016, 14019, 14022, 14023}；rapportd `*:50729`；`UURemoteS`/`uuyc-mux`（`<LAN-IP>` 上 62887 / 54378）；`verge-mih`：`*:53`、127.0.0.1:7897；`tunnel-cl` 127.0.0.1:56965；`xray` 127.0.0.1:10808 |

**与 WTILS/WorldMonitor 默认端口的冲突提示**：本机 5432、8080、8082、3456、8420、8092 等已被占用；WM 官方 compose 的宿主端口（`WM_PORT` 默认 3000、redis-rest 127.0.0.1:8079）此刻未监听。仅供参考——Air 上不会部署 WTILS 生产栈。

## 4. 与 Phase 0 裁决的关系
- 所有上述对象为 **FROZEN**：不停、不启、不删、不迁、不轮换、不新建。
- 其中与 WorldMonitor 相关的运行态（46123/46124、`wm-task-redis-*`）**仅作 DEV/证据用途**，不是 WTILS 生产事实源。
- Q5：Air `NO ROTATION`；Mac mini 首次部署的凭据**全部重新生成**，禁止从 Air 复制。
- Q3：God's Eye 不属于 WTILS Core（本清单中未发现其监听端口之外的信息，不做判断）。

## 5. 未覆盖/UNKNOWN
- 各容器的环境变量、启动参数、网络、重启策略（刻意未取）。
- bind mount 的宿主机路径与是否落入 Syncthing 同步目录。
- node 监听 47173/47174/49512–49514 的具体用途。
- 已停止的 9 个容器的名称与用途（本次只取了运行中列表）。
