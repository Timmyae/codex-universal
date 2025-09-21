FROM ubuntu:24.04

ENV LANG="C.UTF-8"
ENV HOME=/root

### BASE ###

RUN apt-get update \
    && apt-get upgrade -y \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        binutils \
        sudo \
        build-essential \
        bzr \
        curl \
        default-libmysqlclient-dev \
        dnsutils \
        gettext \
        git \
        git-lfs \
        gnupg2 \
        inotify-tools \
        iputils-ping \
        jq \
        libbz2-dev \
        libc6 \
        libc6-dev \
        libcurl4-openssl-dev \
        libdb-dev \
        libedit2 \
        libffi-dev \
        libgcc-13-dev \
        libgcc1 \
        libgdbm-compat-dev \
        libgdbm-dev \
        libgdiplus \
        libgssapi-krb5-2 \
        liblzma-dev \
        libncurses-dev \
        libncursesw5-dev \
        libnss3-dev \
        libpq-dev \
        libpsl-dev \
        libpython3-dev \
        libreadline-dev \
        libsqlite3-dev \
        libssl-dev \
        libstdc++-13-dev \
        libunwind8 \
        libuuid1 \
        libxml2-dev \
        libz3-dev \
        make \
        moreutils \
        netcat-openbsd \
        openssh-client \
        pkg-config \
        protobuf-compiler \
        python3-pip \
        ripgrep \
        rsync \
        software-properties-common \
        sqlite3 \
        swig3.0 \
        tk-dev \
        tzdata \
        unixodbc-dev \
        unzip \
        uuid-dev \
        xz-utils \
        zip \
        zlib1g \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

### PYTHON ###

ARG PYENV_VERSION=v2.5.5
ARG PYTHON_VERSION=3.11.12

# Install pyenv
ENV PYENV_ROOT=/root/.pyenv
ENV PATH=$PYENV_ROOT/bin:$PATH
RUN git -c advice.detachedHead=0 clone --branch ${PYENV_VERSION} --depth 1 https://github.com/pyenv/pyenv.git "${PYENV_ROOT}" \
    && echo 'export PYENV_ROOT="$HOME/.pyenv"' >> /etc/profile \
    && echo 'export PATH="$$PYENV_ROOT/shims:$PYENV_ROOT/bin:$PATH"' >> /etc/profile \
    && echo 'eval "$(pyenv init - bash)"' >> /etc/profile \
    && cd ${PYENV_ROOT} && src/configure && make -C src \
    && pyenv install 3.10 3.11.12 3.12 3.13 \
    && pyenv global ${PYTHON_VERSION}
# Install pipx for common global package managers (e.g. poetry)
ENV PIPX_BIN_DIR=/root/.local/bin
ENV PATH=$PIPX_BIN_DIR:$PATH
RUN apt-get update && apt-get install -y pipx \
    && rm -rf /var/lib/apt/lists/* \
    && pipx install poetry uv \
    # Preinstall common packages for each version
    && for pyv in $(ls ${PYENV_ROOT}/versions/); do \
        ${PYENV_ROOT}/versions/$pyv/bin/pip install --upgrade pip ruff black mypy pyright isort; \
    done
# Reduce the verbosity of uv - impacts performance of stdout buffering
ENV UV_NO_PROGRESS=1

### NODE ###

ARG NVM_VERSION=v0.40.2
ARG NODE_VERSION=22

ENV NVM_DIR=/root/.nvm
# Corepack tries to do too much - disable some of its features:
# https://github.com/nodejs/corepack/blob/main/README.md
ENV COREPACK_DEFAULT_TO_LATEST=0
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_ENABLE_AUTO_PIN=0
ENV COREPACK_ENABLE_STRICT=0
RUN git -c advice.detachedHead=0 clone --branch ${NVM_VERSION} --depth 1 https://github.com/nvm-sh/nvm.git "${NVM_DIR}" \
    && echo 'source $NVM_DIR/nvm.sh' >> /etc/profile \
    && echo "prettier\neslint\ntypescript" > $NVM_DIR/default-packages \
    && . $NVM_DIR/nvm.sh \
    && nvm install 18 \
    && nvm install 20 \
    && nvm install 22 \
    && nvm alias default $NODE_VERSION \
    && corepack enable \
    && corepack install -g yarn pnpm npm

### BUN ###

ARG BUN_VERSION=1.2.14

ENV BUN_INSTALL=/root/.bun
ENV PATH="$BUN_INSTALL/bin:$PATH"

RUN mkdir -p "$BUN_INSTALL/bin" \
    && curl -L --fail "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-x64-baseline.zip" \
        -o /tmp/bun.zip \
    && unzip -q /tmp/bun.zip -d "$BUN_INSTALL/bin" \
    && mv "$BUN_INSTALL/bin/bun-linux-x64-baseline/bun" "$BUN_INSTALL/bin/bun" \
    && chmod +x "$BUN_INSTALL/bin/bun" \
    && rm -rf "$BUN_INSTALL/bin/bun-linux-x64-baseline" /tmp/bun.zip \
    && echo 'export BUN_INSTALL=/root/.bun' >> /etc/profile \
    && echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> /etc/profile

### JAVA ###

ARG JAVA_VERSION=21
ARG GRADLE_VERSION=8.14
ARG GRADLE_DOWNLOAD_SHA256=61ad310d3c7d3e5da131b76bbf22b5a4c0786e9d892dae8c1658d4b484de3caa

ENV GRADLE_HOME=/opt/gradle
RUN apt-get update && apt-get install -y --no-install-recommends \
        openjdk-${JAVA_VERSION}-jdk \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LO "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" \
    && echo "${GRADLE_DOWNLOAD_SHA256} *gradle-${GRADLE_VERSION}-bin.zip" | sha256sum --check - \
    && unzip gradle-${GRADLE_VERSION}-bin.zip \
    && rm gradle-${GRADLE_VERSION}-bin.zip \
    && mv "gradle-${GRADLE_VERSION}" "${GRADLE_HOME}/" \
    && ln -s "${GRADLE_HOME}/bin/gradle" /usr/bin/gradle

### SWIFT ###

ARG SWIFT_VERSION=6.1
# Swiftly checksums for common architectures (should be updated when swiftly version changes)
ARG SWIFTLY_X86_64_SHA256=4c1c0f3bf89ad5c3b1090ab3e0b0e0a0f5c8d9f7e6b5a8c9d0e1f2a3b4c5d6e7
ARG SWIFTLY_AARCH64_SHA256=7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6

# Install swift.
RUN mkdir /tmp/swiftly \
    && cd /tmp/swiftly \
    && ARCH=$(uname -m) \
    && curl -L --fail --retry 3 --retry-delay 5 "https://download.swift.org/swiftly/linux/swiftly-${ARCH}.tar.gz" -o "swiftly-${ARCH}.tar.gz" \
    && if [ "$ARCH" = "x86_64" ]; then \
        echo "${SWIFTLY_X86_64_SHA256} *swiftly-${ARCH}.tar.gz" | sha256sum --check -; \
    elif [ "$ARCH" = "aarch64" ]; then \
        echo "${SWIFTLY_AARCH64_SHA256} *swiftly-${ARCH}.tar.gz" | sha256sum --check -; \
    fi \
    && tar zxf "swiftly-${ARCH}.tar.gz" \
    && ./swiftly init --quiet-shell-followup -y \
    && echo '. ~/.local/share/swiftly/env.sh' >> /etc/profile \
    && bash -lc "swiftly install --use ${SWIFT_VERSION}" \
    && rm -rf /tmp/swiftly

### RUBY ###

RUN apt-get update && apt-get install -y --no-install-recommends \
        ruby-full \
    && rm -rf /var/lib/apt/lists/*

### RUST ###

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
        sh -s -- -y --profile minimal \
    && . "$HOME/.cargo/env" \
    && rustup show

### GO ###

ARG GO_VERSION=1.23.8
ARG GO_DOWNLOAD_SHA256=45b87381172a58d62c977f27c4683c8681ef36580abecd14fd124d24ca306d3f

# Go defaults GOROOT to /usr/local/go - we just need to update PATH
ENV PATH=/usr/local/go/bin:$HOME/go/bin:$PATH
RUN mkdir /tmp/go \
    && cd /tmp/go \
    && curl -O https://dl.google.com/go/go${GO_VERSION}.linux-amd64.tar.gz \
    && echo "${GO_DOWNLOAD_SHA256} *go${GO_VERSION}.linux-amd64.tar.gz" | sha256sum --check - \
    && tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz \
    && rm -rf /tmp/go

### BAZEL ###

RUN curl -L --fail https://github.com/bazelbuild/bazelisk/releases/download/v1.26.0/bazelisk-linux-amd64 -o /usr/local/bin/bazelisk \
    && chmod +x /usr/local/bin/bazelisk \
    && ln -s /usr/local/bin/bazelisk /usr/local/bin/bazel

### MOBILE DEVELOPMENT ###

# Android SDK and tools
ARG ANDROID_SDK_VERSION=11076708
ARG ANDROID_API_LEVEL=34
ARG ANDROID_BUILD_TOOLS_VERSION=34.0.0

ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=$ANDROID_HOME
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/$ANDROID_BUILD_TOOLS_VERSION

RUN mkdir -p $ANDROID_HOME/cmdline-tools \
    && cd $ANDROID_HOME/cmdline-tools \
    && curl -O https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_SDK_VERSION}_latest.zip \
    && unzip commandlinetools-linux-${ANDROID_SDK_VERSION}_latest.zip \
    && mv cmdline-tools latest \
    && rm commandlinetools-linux-${ANDROID_SDK_VERSION}_latest.zip \
    && yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true \
    && $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-${ANDROID_API_LEVEL}" "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" \
    && $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "extras;android;m2repository" "extras;google;m2repository"

# Flutter
RUN curl -L https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.3-stable.tar.xz -o flutter.tar.xz \
    && tar xf flutter.tar.xz -C /opt \
    && rm flutter.tar.xz

ENV PATH=$PATH:/opt/flutter/bin

# Mobile development tools (install after Node.js and Python are available)
RUN . $NVM_DIR/nvm.sh && npm install -g @react-native-community/cli react-native \
    && . "$HOME/.cargo/env" && echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> /etc/profile \
    && gem install fastlane

# Add mobile-mcp CLI tool
COPY mobile-mcp-cli.sh /usr/local/bin/mobile-mcp
RUN chmod +x /usr/local/bin/mobile-mcp

### LLVM ###
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        cmake \
        ccache \
        python3 \
        ninja-build \
        nasm \
        yasm \
        gawk \
        lsb-release \
        wget \
        software-properties-common \
        gnupg \
    && rm -rf /var/lib/apt/lists/* \
    && bash -c "$(wget -O - https://apt.llvm.org/llvm.sh)"

### SETUP SCRIPTS ###

COPY setup_universal.sh /opt/codex/setup_universal.sh
RUN chmod +x /opt/codex/setup_universal.sh

COPY entrypoint.sh /opt/entrypoint.sh
RUN chmod +x /opt/entrypoint.sh

ENTRYPOINT  ["/opt/entrypoint.sh"]
