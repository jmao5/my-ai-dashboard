package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	// 👇 [수정] 구버전 SDK 호환 패키지 경로
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

type SystemStats struct {
	CPU float64 `json:"cpu"`
	RAM float64 `json:"ram"`
}

type ContainerInfo struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	State  string `json:"state"`
	Status string `json:"status"`
}

type RestartRequest struct {
	ContainerID string `json:"containerId"`
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func getSystemStats(w http.ResponseWriter, r *http.Request) {
	cpuPercent, _ := cpu.Percent(time.Second, false)
	vMem, _ := mem.VirtualMemory()

	stats := SystemStats{
		CPU: 0,
		RAM: math.Round(vMem.UsedPercent*100) / 100,
	}
	if len(cpuPercent) > 0 {
		stats.CPU = math.Round(cpuPercent[0]*100) / 100
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func getContainers(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// 클라이언트 생성
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 👇 [수정] 구버전 SDK용 ListOptions 사용 (types.ContainerListOptions)
	containers, err := cli.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var results []ContainerInfo
	for _, ctr := range containers {
		// 이름이 없는 경우 방지
		if len(ctr.Names) == 0 {
			continue
		}
		name := strings.TrimPrefix(ctr.Names[0], "/")
		// 우리 프로젝트 컨테이너만 필터링
		if strings.Contains(name, "dash") {
			results = append(results, ContainerInfo{
				ID:     ctr.ID,
				Name:   name,
				State:  ctr.State,
				Status: ctr.Status,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func restartContainer(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RestartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 👇 [수정] 구버전 SDK는 StopOptions 대신 *time.Duration을 받습니다.
	// nil을 넣으면 기본 설정대로 재시작합니다.
	err = cli.ContainerRestart(ctx, req.ContainerID, nil)

	if err != nil {
		http.Error(w, fmt.Sprintf("Restart failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Restarted successfully"})
}

func main() {
	http.HandleFunc("/api/status", enableCORS(getSystemStats))
	http.HandleFunc("/api/docker/list", enableCORS(getContainers))
	http.HandleFunc("/api/docker/restart", enableCORS(restartContainer))

	fmt.Println("🚀 Go Backend Server running on port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
