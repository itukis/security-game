# SecureCodeArena — Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (Frontend — teammate C)                                    │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐                   │
│  │ Code     │  │ Attack       │  │ Patch       │                   │
│  │ Viewer   │  │ Visualizer   │  │ Editor      │                   │
│  └──────────┘  └──────────────┘  └──────┬──────┘                   │
│                                         │ POST /problems/:id/verify│
└─────────────────────────────────────────┼───────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Orchestrator API  (host, port 4000)                                │
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌────────────────┐            │
│  │ applyPatch  │   │  verify     │   │  HTTP routes   │            │
│  │ .js         │──▶│  .js        │◀──│  (express)     │            │
│  └──────┬──────┘   └──────┬──────┘   └────────────────┘            │
│         │                 │                                         │
│         │ docker cp +     │ invokes attack-engine                   │
│         │ docker restart  │                                         │
└─────────┼─────────────────┼─────────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌───────────────────────────────────────┐   ┌─────────────────────────┐
│  Docker Container: sqli-login         │   │  Attack Engine          │
│  (internal network only, no egress)   │   │  (host process)         │
│                                       │   │                         │
│  ┌─────────┐   ┌──────────┐          │   │  ┌───────────────┐      │
│  │ Express │   │ SQLite   │          │◀──┼──│ attacks/      │      │
│  │ :3000   │   │ DB       │          │   │  │  sqli.js      │      │
│  └─────────┘   └──────────┘          │   │  │  (future...)  │      │
│                                       │   │  └───────────────┘      │
│  /app/patches/  ← writable volume     │   │                         │
│  everything else read-only            │   │  Sends HTTP requests    │
│  256MB mem / 0.5 CPU                  │   │  to container:3000      │
└───────────────────────────────────────┘   └─────────────────────────┘
```

## Verification Cycle — Data Flow

When a user clicks "Verify" with a patch:

```
Step 1: Frontend sends POST /problems/sqli-login/verify
        Body: { "patch": "<unified diff string>" }
                │
                ▼
Step 2: Orchestrator runs Attack Engine against BASELINE container
        → AttackResult { exploited: true, payload: "' OR '1'='1", ... }
                │
                ▼
Step 3: Orchestrator validates patch with `git apply --check`
        → Rejects if patch is malformed or conflicts
                │
                ▼
Step 4: Orchestrator copies patch into container /app/patches/user.patch
        Runs `git apply` inside container, restarts the app process
                │
                ▼
Step 5: Orchestrator waits for container healthcheck (GET /health → 200)
                │
                ▼
Step 6: Orchestrator runs Attack Engine against PATCHED container
        → AttackResult { exploited: false, payload: null, ... }
                │
                ▼
Step 7: Orchestrator computes result:
        passed = (attackBefore.exploited === true) AND
                 (attackAfter.exploited === false)
                │
                ▼
Step 8: Response sent to Frontend:
        {
          attackBefore: AttackResult,
          attackAfter:  AttackResult,
          passed:       true
        }
```

## Security Boundaries

| Boundary | Enforcement |
|---|---|
| Vulnerable app has no internet | Docker internal-only network (see Known Issues) |
| Vulnerable app can't consume host resources | 256MB mem, 0.5 CPU limit |
| Vulnerable app filesystem is read-only | Docker read_only: true, tmpfs for /app/patches |
| User patches are validated before apply | `git apply --check` rejects bad diffs |
| No arbitrary code execution on host | Patches are unified diffs only, applied inside container |

## Outbound network isolation

Day 5 left this as a Known Issue because `internal: true` networks
break host port publishing on the local `docker-compose 5.1.4`.
Day 6 resolved it container-side: each vulnerable app's image installs
`iptables` + `su-exec`, runs `entrypoint.sh` as root (the only thing
running as root in the container), installs three `OUTPUT` rules
(accept loopback, accept `ESTABLISHED,RELATED`, reject the rest), then
drops to `appuser` via `su-exec` before exec'ing the Node process.

Compose adds `cap_add: [NET_ADMIN]` to each vulnerable service so the
entrypoint can configure iptables. Host→container traffic still works
because reply packets match the `ESTABLISHED,RELATED` rule.
