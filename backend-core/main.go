package main

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

// 데이터를 담아서 보낼 그릇 (JSON 구조체)
type SystemStats struct {
	CPU float64 `json:"cpu"` // CPU 사용량 (%)
	RAM float64 `json:"ram"` // 메모리 사용량 (%)
}

// CORS 허용 미들웨어 (이게 없으면 프론트에서 접속 차단됨)
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 모든 곳에서의 접속 허용 (*)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// 브라우저가 "접속해도 돼?"라고 먼저 찔러보는 것(OPTIONS) 처리
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func getSystemStats(w http.ResponseWriter, r *http.Request) {
	// 1. CPU 사용량 가져오기 (1초 동안 측정)
	cpuPercent, _ := cpu.Percent(time.Second, false)

	// 2. 메모리 사용량 가져오기
	vMem, _ := mem.VirtualMemory()

	// 3. 데이터 포장하기
	stats := SystemStats{
		// CPU가 여러 코어일 수 있어서 첫 번째 값을 쓰거나 평균을 씀 (여기선 단순화)
		CPU: 0,
		RAM: math.Round(vMem.UsedPercent*100) / 100, // 소수점 2자리 반올림
	}

	if len(cpuPercent) > 0 {
		stats.CPU = math.Round(cpuPercent[0]*100) / 100
	}

	// 4. JSON으로 변환해서 응답
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func main() {
	// /api/status 경로로 요청이 오면 getSystemStats 실행 (CORS 적용)
	http.HandleFunc("/api/status", enableCORS(getSystemStats))

	fmt.Println("🚀 Go Backend Server running on port 8080 (External: 9015)")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
