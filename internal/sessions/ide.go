package sessions

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type ideLockFile struct {
	WorkspaceFolders []string `json:"workspaceFolders"`
	PID              int      `json:"pid"`
	IDEName          string   `json:"ideName"`
}

// loadIDEMap reads all .lock files in the given directory and returns
// a map from workspace folder path to IDE name.
func loadIDEMap(ideDir string) map[string]string {
	result := make(map[string]string)

	entries, err := os.ReadDir(ideDir)
	if err != nil {
		return result
	}

	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".lock" {
			continue
		}

		data, err := os.ReadFile(filepath.Join(ideDir, e.Name()))
		if err != nil {
			continue
		}

		var lock ideLockFile
		if err := json.Unmarshal(data, &lock); err != nil {
			continue
		}

		if lock.IDEName == "" {
			continue
		}

		for _, folder := range lock.WorkspaceFolders {
			result[folder] = lock.IDEName
		}
	}

	return result
}
