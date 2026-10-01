# MAC_STUDIO_PORTABILITY

Scan: PASS

Checked `src/wtils`, `docker/wtils`, `deploy/wtils`, `scripts/wtils`, and `wtils/phase2` for a user home, a username, an IP literal, and a pinned Ollama URL. Floating Redis tags were checked in `docker/wtils` and `deploy/wtils` only. The persistence audit names the upstream image and does not adopt it.

No hits.

Moving Mac mini → Mac Studio is a compute-host change. Set `WTILS_RUNTIME_HOST` and the storage roots. Do not change pipeline code.

The overlay profile `wtils-future` is not started here.

MAC_MINI_REAL_DEPLOYMENT = WAITING_HARDWARE
NAS_REAL_MOUNT = WAITING_HARDWARE
NAS_IO_BENCHMARK = WAITING_HARDWARE
REAL_24H_STABILITY = WAITING_HARDWARE
REAL_72H_STABILITY = WAITING_HARDWARE

