package sessions

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestParseFileTokenStats(t *testing.T) {
	dir := t.TempDir()
	fpath := filepath.Join(dir, "test.jsonl")

	now := time.Now()
	todayTS := now.Format(time.RFC3339)
	yesterdayTS := now.AddDate(0, 0, -1).Format(time.RFC3339)

	content := `{"type":"user","sessionId":"s1","timestamp":"` + todayTS + `","message":{"role":"user","content":"hello"}}
{"type":"assistant","sessionId":"s1","timestamp":"` + todayTS + `","message":{"role":"assistant","usage":{"input_tokens":100,"cache_creation_input_tokens":50,"cache_read_input_tokens":200,"output_tokens":30}}}
{"type":"assistant","sessionId":"s1","timestamp":"` + todayTS + `","message":{"role":"assistant","usage":{"input_tokens":80,"cache_creation_input_tokens":0,"cache_read_input_tokens":100,"output_tokens":20}}}
{"type":"assistant","sessionId":"s1","timestamp":"` + yesterdayTS + `","message":{"role":"assistant","usage":{"input_tokens":500,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":60}}}
`
	if err := os.WriteFile(fpath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	daily := parseFileTokenStats(fpath)

	todayStr := now.Format("2006-01-02")
	yesterdayStr := now.AddDate(0, 0, -1).Format("2006-01-02")

	// Today: (100+50+200) + (80+0+100) = 530 input, 30+20 = 50 output
	if daily[todayStr].InputTokens != 530 {
		t.Errorf("today input = %d, want 530", daily[todayStr].InputTokens)
	}
	if daily[todayStr].OutputTokens != 50 {
		t.Errorf("today output = %d, want 50", daily[todayStr].OutputTokens)
	}

	// Yesterday: 500 input, 60 output
	if daily[yesterdayStr].InputTokens != 500 {
		t.Errorf("yesterday input = %d, want 500", daily[yesterdayStr].InputTokens)
	}
	if daily[yesterdayStr].OutputTokens != 60 {
		t.Errorf("yesterday output = %d, want 60", daily[yesterdayStr].OutputTokens)
	}
}

func TestParseFileTokenStatsSkipsUserMessages(t *testing.T) {
	dir := t.TempDir()
	fpath := filepath.Join(dir, "test.jsonl")

	now := time.Now()
	ts := now.Format(time.RFC3339)

	content := `{"type":"user","sessionId":"s1","timestamp":"` + ts + `","message":{"role":"user","content":"hello"}}
{"type":"progress","sessionId":"s1","timestamp":"` + ts + `","data":{}}
`
	if err := os.WriteFile(fpath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	daily := parseFileTokenStats(fpath)
	if len(daily) != 0 {
		t.Errorf("expected empty stats for non-assistant messages, got %d entries", len(daily))
	}
}
