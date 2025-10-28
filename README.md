# codex-universal

## 🎯 Universal Workflow Dashboard

### 📊 Real-Time Status Monitor

| Workflow Name | Status | Last Test | Build # | Next Check | Actions/Notes |
|--------------|--------|-----------|---------|------------|---------------|
| Build Image | ![Status](https://github.com/Timmyae/codex-universal/actions/workflows/build-image.yml/badge.svg) | Auto | Latest | Live | Container build & push |
| Go Workflow | ![Status](https://github.com/Timmyae/codex-universal/actions/workflows/go.yml/badge.svg) | Auto | Latest | Live | Go tests & validation |
| Dashboard Monitor | ![Status](https://github.com/Timmyae/codex-universal/actions/workflows/dashboard-monitor.yml/badge.svg) | Auto | Latest | Live | Monitors all workflows |
| Health Check | ![Status](https://github.com/Timmyae/codex-universal/actions/workflows/health-check.yml/badge.svg) | Auto | Latest | 15min | System health validation |

### 🔄 Automatic Workflow Registration

All new workflows added to `.github/workflows/` are automatically:
- ✅ Detected and registered
- ✅ Monitored for status changes
- ✅ Tested on every commit
- ✅ Included in dashboard updates
- ✅ Linked to notification system

### 📈 Workflow Statistics

```yaml
Total Workflows: Auto-counted
Active Monitors: Real-time
Success Rate: Calculated automatically
Last Dashboard Update: Auto-updated on every commit
```

### 🛠️ Quick Actions

- [View All Workflow Runs](https://github.com/Timmyae/codex-universal/actions)
- [Create New Workflow](https://github.com/Timmyae/codex-universal/actions/new)
- [Workflow Settings](https://github.com/Timmyae/codex-universal/settings/actions)

---

## 🚀 Docker Usage

```bash
docker run --rm -it \
    -e CODEX_ENV_PYTHON_VERSION=3.13 \
    -e CODEX_ENV_NODE_VERSION=22 \
    -e CODEX_ENV_RUST_VERSION=1.87.0 \
    -e CODEX_ENV_GO_VERSION=1.23.8 \
    -e CODEX_ENV_SWIFT_VERSION=6.1 \
    -v $(pwd):/workspace/$(basename $(pwd)) -w /workspace/$(basename $(pwd)) \
    ghcr.io/openai/codex-universal:latest
```

`codex-universal` includes setup scripts that look for `CODEX_ENV_*` environment variables and configures the language version accordingly.

### Configuring language runtimes

The following environment variables can be set to configure runtime installation. Note that a limited subset of versions are supported (indicated in the table below):

| Environment variable       | Description                | Supported versions                               | Additional packages                                                  |
| -------------------------- | -------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `CODEX_ENV_PYTHON_VERSION` | Python version to install  | `3.10`, `3.11.12`, `3.12`, `3.13`                | `pyenv`, `poetry`, `uv`, `ruff`, `black`, `mypy`, `pyright`, `isort` |
| `CODEX_ENV_NODE_VERSION`   | Node.js version to install | `18`, `20`, `22`                                 | `corepack`, `yarn`, `pnpm`, `npm`                                    |
| `CODEX_ENV_RUST_VERSION`   | Rust version to install    | `1.83.0`, `1.84.1`, `1.85.1`, `1.86.0`, `1.87.0` |                                                                      |
| `CODEX_ENV_GO_VERSION`     | Go version to install      | `1.22.12`, `1.23.8`, `1.24.3`                    |                                                                      |
| `CODEX_ENV_SWIFT_VERSION`  | Swift version to install   | `5.10`, `6.1`                                    |                                                                      |

## What's included

In addition to the packages specified in the table above, the following packages are also installed:

- `ruby`: 3.2.3
- `bun`: 1.2.10
- `java`: 21
- `bazelisk` / `bazel`

See [Dockerfile](Dockerfile) for the full details of installed packages.

---

## 📋 Workflow Integration Guide

### Adding New Workflows

1. Create workflow file in `.github/workflows/`
2. Dashboard auto-detects and registers it
3. Status badge auto-generated
4. Monitoring starts immediately

### Template for New Workflows

```yaml
name: Your Workflow Name

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  your-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Your steps here
        run: echo "Workflow running"
```

### Dashboard Auto-Update

The dashboard updates automatically via:
- **Commit hooks**: Updates on every push
- **Scheduled checks**: Every 15 minutes
- **Workflow completion**: After each workflow run
- **Manual trigger**: Via workflow_dispatch

---

*Dashboard powered by GitHub Actions • Auto-monitoring enabled • Last updated: Automatic*
