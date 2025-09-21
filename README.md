# codex-universal

`codex-universal` is a reference implementation of the base Docker image available in [OpenAI Codex](http://platform.openai.com/docs/codex).

This repository is intended to help developers cutomize environments in Codex, by providing a similar image that can be pulled and run locally. This is not an identical environment but should help for debugging and development.

For more details on environment setup, see [OpenAI Codex](http://platform.openai.com/docs/codex).

## Usage

The Docker image is available at:

```
docker pull ghcr.io/openai/codex-universal:latest
```

The below script shows how can you approximate the `setup` environment in Codex:

```sh
# See below for environment variable options.
# This script mounts the current directory similar to how it would get cloned in.
docker run --rm -it \
    -e CODEX_ENV_PYTHON_VERSION=3.12 \
    -e CODEX_ENV_NODE_VERSION=20 \
    -e CODEX_ENV_RUST_VERSION=1.87.0 \
    -e CODEX_ENV_GO_VERSION=1.23.8 \
    -e CODEX_ENV_SWIFT_VERSION=6.1 \
    -e CODEX_ENV_MOBILE_DEVELOPMENT=true \
    -v $(pwd):/workspace/$(basename $(pwd)) -w /workspace/$(basename $(pwd)) \
    ghcr.io/openai/codex-universal:latest
```

`codex-universal` includes setup scripts that look for `CODEX_ENV_*` environment variables and configures the language version accordingly.

### Configuring language runtimes

The following environment variables can be set to configure runtime installation. Note that a limited subset of versions are supported (indicated in the table below):

| Environment variable          | Description                          | Supported versions                               | Additional packages                                                  |
| ----------------------------- | ------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------- |
| `CODEX_ENV_PYTHON_VERSION`    | Python version to install           | `3.10`, `3.11.12`, `3.12`, `3.13`                | `pyenv`, `poetry`, `uv`, `ruff`, `black`, `mypy`, `pyright`, `isort` |
| `CODEX_ENV_NODE_VERSION`      | Node.js version to install          | `18`, `20`, `22`                                 | `corepack`, `yarn`, `pnpm`, `npm`                                    |
| `CODEX_ENV_RUST_VERSION`      | Rust version to install             | `1.83.0`, `1.84.1`, `1.85.1`, `1.86.0`, `1.87.0` |                                                                      |
| `CODEX_ENV_GO_VERSION`        | Go version to install               | `1.22.12`, `1.23.8`, `1.24.3`                    |                                                                      |
| `CODEX_ENV_SWIFT_VERSION`     | Swift version to install            | `5.10`, `6.1`                                    |                                                                      |
| `CODEX_ENV_MOBILE_DEVELOPMENT`| Enable mobile development tools     | `true`, `false`                                  | Android SDK, Flutter, React Native, MCP tools                       |

## What's included

In addition to the packages specified in the table above, the following packages are also installed:

- `ruby`: 3.2.3
- `bun`: 1.2.10
- `java`: 21
- `bazelisk` / `bazel`

### Mobile Development Tools

When `CODEX_ENV_MOBILE_DEVELOPMENT=true` is set, the following mobile development tools are available:

- **Android SDK**: Android API Level 34, Build Tools 34.0.0, Platform Tools
- **Flutter**: Latest stable version with Android licensing handled
- **React Native**: CLI and development tools
- **Mobile MCP CLI**: Custom Mobile Control Protocol CLI for project management and automation
- **Fastlane**: Mobile app deployment automation

#### Using Mobile MCP CLI

The Mobile MCP CLI provides streamlined commands for mobile development:

```bash
# Initialize mobile development environment
mobile-mcp init

# Check environment status
mobile-mcp doctor

# Create new projects
mobile-mcp create react-native MyReactApp
mobile-mcp create flutter my_flutter_app

# Get help
mobile-mcp help
```

See [Dockerfile](Dockerfile) for the full details of installed packages.
