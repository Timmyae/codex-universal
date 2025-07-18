name: Build and push

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ghcr.io/timmyae/codex-universal:latest

set -euo pipefail

CODEX_ENV_PYTHON_VERSION=${CODEX_ENV_PYTHON_VERSION:-}
CODEX_ENV_NODE_VERSION=${CODEX_ENV_NODE_VERSION:-}
CODEX_ENV_RUST_VERSION=${CODEX_ENV_RUST_VERSION:-}
CODEX_ENV_GO_VERSION=${CODEX_ENV_GO_VERSION:-}
CODEX_ENV_SWIFT_VERSION=${CODEX_ENV_SWIFT_VERSION:-}

echo "Configuring language runtimes..."

# For Python and Node, always run the install commands so we can install
# global libraries for linting and formatting. This just switches the version.

# For others (e.g. rust), to save some time on bootup we only install other language toolchains
# if the versions differ.

if [ -n "${CODEX_ENV_PYTHON_VERSION}" ]; then
    echo "# Python: ${CODEX_ENV_PYTHON_VERSION}"
    pyenv global "${CODEX_ENV_PYTHON_VERSION}"
fi

if [ -n "${CODEX_ENV_NODE_VERSION}" ]; then
    echo "# Node.js: ${CODEX_ENV_NODE_VERSION}"
    nvm alias default "${CODEX_ENV_NODE_VERSION}"
    nvm use "${CODEX_ENV_NODE_VERSION}"
    corepack enable
    corepack install -g yarn pnpm npm
fi

if [ -n "${CODEX_ENV_RUST_VERSION}" ]; then
    current=$(rustc --version | awk '{print $2}')   # ==> 1.86.0
    echo "# Rust: ${CODEX_ENV_RUST_VERSION} (default: ${current})"
    if [ "${current}" != "${CODEX_ENV_RUST_VERSION}" ]; then
        rustup toolchain install --no-self-update "${CODEX_ENV_RUST_VERSION}"
        rustup default "${CODEX_ENV_RUST_VERSION}"
        # Pre-install common linters/formatters
        # clippy is already installed
    fi
fi

if [ -n "${CODEX_ENV_GO_VERSION}" ]; then
    current=$(go version | awk '{print $3}' | sed 's/go//')   # ==> 1.23.8 (strip 'go' prefix)
    echo "# Go: go${CODEX_ENV_GO_VERSION} (default: go${current})"
    if [ "${current}" != "${CODEX_ENV_GO_VERSION}" ]; then
        go install "golang.org/dl/go${CODEX_ENV_GO_VERSION}@latest"
        "go${CODEX_ENV_GO_VERSION}" download
        # Place new go first in PATH for current session and future sessions
        NEW_GO_ROOT=$("go${CODEX_ENV_GO_VERSION}" env GOROOT)
        export PATH="${NEW_GO_ROOT}/bin:$PATH"
        echo "export PATH=${NEW_GO_ROOT}/bin:\$PATH" >> /etc/profile
        # Verify the switch worked
        echo "# Switched to Go version: $(go version)"
        # Pre-install common linters/formatters
        if command -v golangci-lint >/dev/null 2>&1; then
            golangci-lint --version # Already installed in base image, save us some bootup time
        fi
    fi
fi

if [ -n "${CODEX_ENV_SWIFT_VERSION}" ]; then
    current=$(swift --version | awk -F'version ' '{print $2}' | awk '{print $1}')   # ==> 6.1
    echo "# Swift: ${CODEX_ENV_SWIFT_VERSION} (default: ${current})"
    if [ "${current}" != "${CODEX_ENV_SWIFT_VERSION}" ]; then
        swiftly install --use "${CODEX_ENV_SWIFT_VERSION}"
    fi
fi
