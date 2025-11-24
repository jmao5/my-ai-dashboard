package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container" // 수정됨 (import 경로 주의)
	"github.com/docker/docker/client"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

type SystemStats struct {
	CPU float64 `json:"cpu"`
	RAM float64 `json:"ram"`
}

// 도커 컨테이너 정보 구조체
type ContainerInfo struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	State  string `json:"state"`
	Status string `json:"status"`
}

// 재시작 요청 받을 구조체
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

// 👇 1. 도커 컨테이너 목록 가져오기 API
func getContainers(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 모든 컨테이너 조회
	containers, err := cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var results []ContainerInfo
	for _, ctr := range containers {
		// 우리 프로젝트 컨테이너만 필터링 (이름에 'dash'가 들어간 것만)
		name := strings.TrimPrefix(ctr.Names[0], "/")
		if strings.Contains(name, "dash") {
			results = append(results, ContainerInfo{
				ID:     ctr.ID,
				Name:   name,
				State:  ctr.State,  // running, exited 등
				Status: ctr.Status, // "Up 2 hours" 등
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// 👇 2. 컨테이너 재시작 API
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

	// 컨테이너 재시작 (타임아웃 설정 가능)
	// Timeout은 deprecated 되었지만 구버전 호환성을 위해 nil이나 정수포인터 사용
	err = cli.ContainerRestart(ctx, req.ContainerID, container.StopOptions{})
	if err != nil {
		http.Error(w, fmt.Sprintf("Restart failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Restarted successfully"})
}

func main() {
	http.HandleFunc("/api/status", enableCORS(getSystemStats))
	// 새로운 API 등록
	http.HandleFunc("/api/docker/list", enableCORS(getContainers))
	http.HandleFunc("/api/docker/restart", enableCORS(restartContainer))

	fmt.Println("🚀 Go Backend Server running on port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
