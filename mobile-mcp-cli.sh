#!/bin/bash

# Mobile MCP (Mobile Control Protocol) CLI wrapper
# This is a wrapper script for mobile development workflow automation

COMMAND="$1"
shift

case "$COMMAND" in
    "init")
        echo "Initializing Mobile MCP environment..."
        echo "Setting up mobile development workspace..."
        # Accept Android licenses if not already done
        if [ -n "$ANDROID_HOME" ]; then
            yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null 2>&1 || true
        fi
        # Initialize Flutter if available
        if command -v flutter >/dev/null 2>&1; then
            flutter doctor --android-licenses >/dev/null 2>&1 || true
            flutter config --no-analytics
        fi
        echo "Mobile MCP environment ready"
        ;;
    "doctor")
        echo "Mobile MCP Environment Status:"
        echo "=============================="
        
        # Check Android SDK
        if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
            echo "✓ Android SDK: Available at $ANDROID_HOME"
        else
            echo "✗ Android SDK: Not found"
        fi
        
        # Check Flutter
        if command -v flutter >/dev/null 2>&1; then
            echo "✓ Flutter: $(flutter --version | head -1)"
        else
            echo "✗ Flutter: Not available"
        fi
        
        # Check React Native
        if command -v npx >/dev/null 2>&1; then
            echo "✓ React Native: CLI available via npx"
        else
            echo "✗ React Native: CLI not available"
        fi
        
        # Check Fastlane
        if command -v fastlane >/dev/null 2>&1; then
            echo "✓ Fastlane: $(fastlane --version | head -1)"
        else
            echo "✗ Fastlane: Not available"
        fi
        ;;
    "create")
        PROJECT_TYPE="$1"
        PROJECT_NAME="$2"
        
        if [ -z "$PROJECT_TYPE" ] || [ -z "$PROJECT_NAME" ]; then
            echo "Usage: mobile-mcp create <react-native|flutter> <project-name>"
            exit 1
        fi
        
        case "$PROJECT_TYPE" in
            "react-native")
                echo "Creating React Native project: $PROJECT_NAME"
                npx @react-native-community/cli@latest init "$PROJECT_NAME"
                ;;
            "flutter")
                echo "Creating Flutter project: $PROJECT_NAME"
                flutter create "$PROJECT_NAME"
                ;;
            *)
                echo "Unsupported project type: $PROJECT_TYPE"
                echo "Supported types: react-native, flutter"
                exit 1
                ;;
        esac
        ;;
    "help"|"--help"|"-h")
        echo "Mobile MCP CLI - Mobile Control Protocol Development Tools"
        echo ""
        echo "Usage: mobile-mcp <command> [options]"
        echo ""
        echo "Commands:"
        echo "  init                     Initialize mobile development environment"
        echo "  doctor                   Check mobile development environment status"
        echo "  create <type> <name>     Create new mobile project (react-native|flutter)"
        echo "  help                     Show this help message"
        echo ""
        echo "Examples:"
        echo "  mobile-mcp init"
        echo "  mobile-mcp doctor"
        echo "  mobile-mcp create react-native MyApp"
        echo "  mobile-mcp create flutter my_flutter_app"
        ;;
    *)
        echo "Unknown command: $COMMAND"
        echo "Use 'mobile-mcp help' for usage information"
        exit 1
        ;;
esac