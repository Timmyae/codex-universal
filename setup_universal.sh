#!/bin/bash

set -euo pipefail

CODEX_ENV_PYTHON_VERSION=${CODEX_ENV_PYTHON_VERSION:-}
CODEX_ENV_NODE_VERSION=${CODEX_ENV_NODE_VERSION:-}
CODEX_ENV_RUST_VERSION=${CODEX_ENV_RUST_VERSION:-}
CODEX_ENV_GO_VERSION=${CODEX_ENV_GO_VERSION:-}
CODEX_ENV_SWIFT_VERSION=${CODEX_ENV_SWIFT_VERSION:-}
CODEX_ENV_MOBILE_DEVELOPMENT=${CODEX_ENV_MOBILE_DEVELOPMENT:-}

echo "Configuring language runtimes..."

# Python config
if [ -n "${CODEX_ENV_PYTHON_VERSION}" ]; then
    echo "# Python: ${CODEX_ENV_PYTHON_VERSION}"
    pyenv global "${CODEX_ENV_PYTHON_VERSION}"
fi

# Node.js config
if [ -n "${CODEX_ENV_NODE_VERSION}" ]; then
    echo "# Node.js: ${CODEX_ENV_NODE_VERSION}"
    . $NVM_DIR/nvm.sh
    nvm alias default "${CODEX_ENV_NODE_VERSION}"
    nvm use "${CODEX_ENV_NODE_VERSION}"
    corepack enable
    corepack install -g yarn pnpm npm
fi

# Rust config
if [ -n "${CODEX_ENV_RUST_VERSION}" ]; then
    current=$(rustc --version | awk '{print $2}')
    echo "# Rust: ${CODEX_ENV_RUST_VERSION} (default: ${current})"
    if [ "${current}" != "${CODEX_ENV_RUST_VERSION}" ]; then
        rustup toolchain install --no-self-update "${CODEX_ENV_RUST_VERSION}"
        rustup default "${CODEX_ENV_RUST_VERSION}"
    fi
fi

# Go config
if [ -n "${CODEX_ENV_GO_VERSION}" ]; then
    current=$(go version | awk '{print $3}' | sed 's/go//')
    echo "# Go: go${CODEX_ENV_GO_VERSION} (default: go${current})"
    if [ "${current}" != "${CODEX_ENV_GO_VERSION}" ]; then
        go install "golang.org/dl/go${CODEX_ENV_GO_VERSION}@latest"
        "go${CODEX_ENV_GO_VERSION}" download
        NEW_GO_ROOT=$("go${CODEX_ENV_GO_VERSION}" env GOROOT)
        export PATH="${NEW_GO_ROOT}/bin:$PATH"
        echo "export PATH=${NEW_GO_ROOT}/bin:\$PATH" >> /etc/profile
        echo "# Switched to Go version: $(go version)"
        if command -v golangci-lint >/dev/null 2>&1; then
            golangci-lint --version
        fi
    fi
fi

# Swift config
if [ -n "${CODEX_ENV_SWIFT_VERSION}" ]; then
    current=$(swift --version | awk -F'version ' '{print $2}' | awk '{print $1}')
    echo "# Swift: ${CODEX_ENV_SWIFT_VERSION} (default: ${current})"
    if [ "${current}" != "${CODEX_ENV_SWIFT_VERSION}" ]; then
        . ~/.local/share/swiftly/env.sh
        swiftly install --use "${CODEX_ENV_SWIFT_VERSION}"
    fi
fi

# Mobile development config
if [ "${CODEX_ENV_MOBILE_DEVELOPMENT}" = "true" ]; then
    echo "# Configuring mobile development environment"
    
    # Initialize mobile development environment using mobile-mcp
    if command -v mobile-mcp >/dev/null 2>&1; then
        mobile-mcp init
    fi
    
    echo "# Mobile development environment ready"
    echo "# Use 'mobile-mcp doctor' to check environment status"
    echo "# Use 'mobile-mcp create <react-native|flutter> <project-name>' to create projects"
fi