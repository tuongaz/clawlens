package sessions

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseSessionContextTokens(t *testing.T) {
	// Create a temp JSONL file with realistic messages.
	dir := t.TempDir()
	fpath := filepath.Join(dir, "test-session.jsonl")

	content := `{"type":"user","sessionId":"abc-123","cwd":"/tmp/proj","timestamp":"2026-03-27T10:00:00Z","message":{"role":"user","content":"hello"},"version":"2.1.77","gitBranch":"main"}
{"type":"assistant","sessionId":"abc-123","cwd":"/tmp/proj","timestamp":"2026-03-27T10:00:05Z","message":{"role":"assistant","model":"claude-opus-4-6","content":"hi","stop_reason":"end_turn","usage":{"input_tokens":3,"cache_creation_input_tokens":5000,"cache_read_input_tokens":0,"output_tokens":50}},"version":"2.1.77","gitBranch":"main"}
{"type":"user","sessionId":"abc-123","cwd":"/tmp/proj","timestamp":"2026-03-27T10:01:00Z","message":{"role":"user","content":"do more"},"version":"2.1.77","gitBranch":"main"}
{"type":"assistant","sessionId":"abc-123","cwd":"/tmp/proj","timestamp":"2026-03-27T10:01:10Z","message":{"role":"assistant","model":"claude-opus-4-6","content":"done","stop_reason":"end_turn","usage":{"input_tokens":1,"cache_creation_input_tokens":200,"cache_read_input_tokens":5000,"output_tokens":100}},"version":"2.1.77","gitBranch":"main"}
`
	if err := os.WriteFile(fpath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	sess, err := parseSession(fpath)
	if err != nil {
		t.Fatal(err)
	}

	// Context tokens = input_tokens + cache_creation + cache_read from LAST assistant msg
	// = 1 + 200 + 5000 = 5201
	if sess.ContextTokens != 5201 {
		t.Errorf("ContextTokens = %d, want 5201", sess.ContextTokens)
	}
	if sess.MaxContextTokens != 1_000_000 {
		t.Errorf("MaxContextTokens = %d, want 1000000", sess.MaxContextTokens)
	}
	if sess.Model != "claude-opus-4-6" {
		t.Errorf("Model = %q, want %q", sess.Model, "claude-opus-4-6")
	}
}

func TestParseSessionUnknownModelFallback(t *testing.T) {
	dir := t.TempDir()
	fpath := filepath.Join(dir, "test-session.jsonl")

	content := `{"type":"user","sessionId":"xyz-789","cwd":"/tmp","timestamp":"2026-03-27T10:00:00Z","message":{"role":"user","content":"hi"},"version":"2.1.77"}
{"type":"assistant","sessionId":"xyz-789","cwd":"/tmp","timestamp":"2026-03-27T10:00:05Z","message":{"role":"assistant","model":"claude-future-99","content":"hey","stop_reason":"end_turn","usage":{"input_tokens":100,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":20}},"version":"2.1.77"}
`
	if err := os.WriteFile(fpath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	sess, err := parseSession(fpath)
	if err != nil {
		t.Fatal(err)
	}

	if sess.ContextTokens != 100 {
		t.Errorf("ContextTokens = %d, want 100", sess.ContextTokens)
	}
	// Unknown model should fallback to 200_000
	if sess.MaxContextTokens != 200_000 {
		t.Errorf("MaxContextTokens = %d, want 200000", sess.MaxContextTokens)
	}
}

func TestModelContextLimits(t *testing.T) {
	tests := []struct {
		model string
		want  int
	}{
		{"claude-opus-4-6", 1_000_000},
		{"claude-sonnet-4-6", 200_000},
		{"claude-haiku-4-5-20251001", 200_000},
		{"unknown-model", 200_000},
		{"", 200_000},
	}
	for _, tt := range tests {
		got := getModelContextLimit(tt.model)
		if got != tt.want {
			t.Errorf("getModelContextLimit(%q) = %d, want %d", tt.model, got, tt.want)
		}
	}
}
