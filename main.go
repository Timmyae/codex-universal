package main

import "fmt"

func main() {
	fmt.Println("Codex Universal - Multi-language development environment")
}

// Hello returns a greeting message
func Hello(name string) string {
	if name == "" {
		return "Hello, World!"
	}
	return fmt.Sprintf("Hello, %s!", name)
}