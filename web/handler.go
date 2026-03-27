package web

import (
	"bytes"
	"encoding/json"
	"io/fs"
	"log"
	"net/http"
	"time"

	"github.com/coder/websocket"
	"github.com/tuongaz/clawhawk/internal/sessions"
)

const (
	tickFast = 10 * time.Millisecond
	tickSlow = 2 * time.Second
)

type dashboardMessage struct {
	Groups []sessions.ProjectGroup `json:"groups"`
	Stats  sessions.TokenStats     `json:"stats"`
}

func hasActiveSessions(groups []sessions.ProjectGroup) bool {
	for _, g := range groups {
		for _, s := range g.Sessions {
			if s.IsActive {
				return true
			}
		}
	}
	return false
}

// HandleWebSocket accepts a WebSocket connection and pushes session data.
// Polls every 10ms when active sessions exist, every 2s otherwise.
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		log.Printf("websocket accept: %v", err)
		return
	}
	defer conn.CloseNow()

	ticker := time.NewTicker(tickFast)
	defer ticker.Stop()

	ctx := conn.CloseRead(r.Context())
	var lastData []byte
	currentInterval := tickFast

	for {
		select {
		case <-ctx.Done():
			conn.Close(websocket.StatusNormalClosure, "")
			return
		case <-ticker.C:
			groups, err := sessions.LoadGroupedSessions(0)
			if err != nil {
				log.Printf("load sessions: %v", err)
				continue
			}

			stats, _ := sessions.LoadTokenStats()

			data, err := json.Marshal(dashboardMessage{Groups: groups, Stats: stats})
			if err != nil {
				log.Printf("marshal sessions: %v", err)
				continue
			}

			// Skip send if nothing changed.
			if bytes.Equal(data, lastData) {
				// Still adjust tick rate even if data unchanged.
				newInterval := tickSlow
				if hasActiveSessions(groups) {
					newInterval = tickFast
				}
				if newInterval != currentInterval {
					currentInterval = newInterval
					ticker.Reset(currentInterval)
				}
				continue
			}
			lastData = data

			// Adjust tick rate based on activity.
			newInterval := tickSlow
			if hasActiveSessions(groups) {
				newInterval = tickFast
			}
			if newInterval != currentInterval {
				currentInterval = newInterval
				ticker.Reset(currentInterval)
			}

			if err := conn.Write(ctx, websocket.MessageText, data); err != nil {
				return
			}
		}
	}
}

// StaticHandler serves the embedded frontend files with SPA fallback.
func StaticHandler() http.Handler {
	distContent, err := fs.Sub(distFS, "dist")
	if err != nil {
		log.Fatalf("failed to create sub filesystem: %v", err)
	}

	fileServer := http.FileServer(http.FS(distContent))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" {
			fileServer.ServeHTTP(w, r)
			return
		}

		f, err := distContent.Open(path[1:])
		if err != nil {
			r.URL.Path = "/"
			fileServer.ServeHTTP(w, r)
			return
		}
		f.Close()

		fileServer.ServeHTTP(w, r)
	})
}
