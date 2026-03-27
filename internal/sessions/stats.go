package sessions

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// TokenPeriod holds aggregated token counts for a time period.
type TokenPeriod struct {
	InputTokens  int `json:"inputTokens"`
	OutputTokens int `json:"outputTokens"`
}

// TokenStats holds token usage aggregated by time period.
type TokenStats struct {
	Today     TokenPeriod `json:"today"`
	ThisWeek  TokenPeriod `json:"thisWeek"`
	ThisMonth TokenPeriod `json:"thisMonth"`
}

type cachedFileStats struct {
	modTime    time.Time
	dailyStats map[string]TokenPeriod // "YYYY-MM-DD" -> tokens
}

var (
	statsCacheMu sync.Mutex
	statsCache   = make(map[string]cachedFileStats)
)

// LoadTokenStats scans all session JSONL files and returns token usage
// aggregated by today, this week (Monday-based), and this month.
func LoadTokenStats() (TokenStats, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return TokenStats{}, err
	}

	pattern := filepath.Join(home, ".claude", "projects", "*", "*.jsonl")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return TokenStats{}, err
	}

	now := time.Now()
	todayStr := now.Format("2006-01-02")

	// ISO week starts on Monday.
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	weekStart := now.AddDate(0, 0, -(weekday - 1))
	weekStartStr := weekStart.Format("2006-01-02")

	monthStartStr := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")

	var stats TokenStats

	for _, f := range files {
		if strings.Contains(f, string(filepath.Separator)+"subagents"+string(filepath.Separator)) {
			continue
		}

		info, err := os.Stat(f)
		if err != nil {
			continue
		}

		statsCacheMu.Lock()
		cached, ok := statsCache[f]
		statsCacheMu.Unlock()

		var dailyStats map[string]TokenPeriod
		if ok && cached.modTime.Equal(info.ModTime()) {
			dailyStats = cached.dailyStats
		} else {
			dailyStats = parseFileTokenStats(f)
			statsCacheMu.Lock()
			statsCache[f] = cachedFileStats{modTime: info.ModTime(), dailyStats: dailyStats}
			statsCacheMu.Unlock()
		}

		for dateStr, tp := range dailyStats {
			if dateStr == todayStr {
				stats.Today.InputTokens += tp.InputTokens
				stats.Today.OutputTokens += tp.OutputTokens
			}
			if dateStr >= weekStartStr {
				stats.ThisWeek.InputTokens += tp.InputTokens
				stats.ThisWeek.OutputTokens += tp.OutputTokens
			}
			if dateStr >= monthStartStr {
				stats.ThisMonth.InputTokens += tp.InputTokens
				stats.ThisMonth.OutputTokens += tp.OutputTokens
			}
		}
	}

	return stats, nil
}

type statsMessage struct {
	Type      string `json:"type"`
	Timestamp string `json:"timestamp"`
	Message   struct {
		Usage messageUsage `json:"usage"`
	} `json:"message"`
}

func parseFileTokenStats(fpath string) map[string]TokenPeriod {
	result := make(map[string]TokenPeriod)

	f, err := os.Open(fpath)
	if err != nil {
		return result
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var msg statsMessage
		if err := json.Unmarshal(line, &msg); err != nil {
			continue
		}

		if msg.Type != "assistant" {
			continue
		}

		u := msg.Message.Usage
		if u.InputTokens == 0 && u.OutputTokens == 0 && u.CacheCreationInputTokens == 0 && u.CacheReadInputTokens == 0 {
			continue
		}

		t, err := time.Parse(time.RFC3339Nano, msg.Timestamp)
		if err != nil {
			continue
		}
		dateStr := t.Format("2006-01-02")

		tp := result[dateStr]
		tp.InputTokens += u.InputTokens + u.CacheCreationInputTokens + u.CacheReadInputTokens
		tp.OutputTokens += u.OutputTokens
		result[dateStr] = tp
	}

	return result
}
