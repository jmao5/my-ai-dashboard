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

	// 1. 클라이언트에게 먼저 "알겠어!"라고 응답을 보냅니다. (성공 메시지)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Restart command received. Restarting in 1 second...",
	})

	// 응답이 확실히 전송되도록 플러시(Flush) - 선택사항이지만 안전함
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	// 2. 별도의 고루틴(백그라운드)에서 1초 뒤에 재시작을 실행합니다.
	// (메인 스레드는 이미 응답을 보내고 끝났으므로 에러가 안 남)
	go func(targetID string) {
		// 1초 대기 (응답이 날아갈 시간 벌어주기)
		time.Sleep(1 * time.Second)

		ctx := context.Background()
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			fmt.Printf("Error creating client: %v\n", err)
			return
		}

		fmt.Printf("♻️ Restarting container: %s\n", targetID)
		// 재시작 실행
		err = cli.ContainerRestart(ctx, targetID, nil)
		if err != nil {
			fmt.Printf("❌ Failed to restart container %s: %v\n", targetID, err)
		}
	}(req.ContainerID)
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
