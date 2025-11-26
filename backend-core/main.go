package main

import (
	"bytes" // 👈 추가
	_ "bytes"
	"context"
	"database/sql" // 👈 DB 연동 패키지
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"strconv"
	_ "strconv" // 👈 추가
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	_ "github.com/lib/pq" // 👈 Postgres 드라이버 (직접 안 써도 import 필수)
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/mem"
)

// DB 연결 객체
var db *sql.DB

type SystemStats struct {
	CPU float64 `json:"cpu"`
	RAM float64 `json:"ram"`
}

// 이력 데이터 구조체 (DB 저장용)
type MetricHistory struct {
	Time string  `json:"time"`
	CPU  float64 `json:"cpu"`
	RAM  float64 `json:"ram"`
}

// ... (ContainerInfo, RestartRequest 구조체는 그대로 유지) ...
type ContainerInfo struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	State  string `json:"state"`
	Status string `json:"status"`
}

type RestartRequest struct {
	ContainerID string `json:"containerId"`
}

var (
	telegramBotToken string // 👈 변경
	telegramChatID   string // 👈 변경
	alertThreshold   float64
	lastAlertTime    time.Time
)

// DB 초기화 및 테이블 생성
func initDB() {
	var err error
	dsn := os.Getenv("DB_DSN") // docker-compose.yml에서 가져옴
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		fmt.Println("❌ DB 연결 설정 실패:", err)
		return
	}

	// 실제 연결 테스트 (재시도 로직)
	for i := 0; i < 10; i++ {
		err = db.Ping()
		if err == nil {
			fmt.Println("✅ DB 연결 성공!")
			break
		}
		fmt.Println("⏳ DB 연결 대기 중...", err)
		time.Sleep(2 * time.Second)
	}

	// 테이블 생성 (없으면 만듦)
	query := `
	CREATE TABLE IF NOT EXISTS system_metrics (
		id SERIAL PRIMARY KEY,
		cpu REAL,
		ram REAL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`
	_, err = db.Exec(query)
	if err != nil {
		fmt.Println("❌ 테이블 생성 실패:", err)
	}
}

// API: 최근 데이터 조회
func getMetricsHistory(w http.ResponseWriter, r *http.Request) {
	// 최근 20개 데이터만 가져오기 (시간순 정렬)
	rows, err := db.Query("SELECT to_char(created_at, 'HH24:MI:SS'), cpu, ram FROM system_metrics ORDER BY created_at DESC LIMIT 20")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var history []MetricHistory
	for rows.Next() {
		var m MetricHistory
		rows.Scan(&m.Time, &m.CPU, &m.RAM)
		history = append(history, m)
	}

	// DB에서는 최신순(DESC)으로 가져왔으니, 그래프를 위해 시간순(과거->현재)으로 뒤집기
	for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
		history[i], history[j] = history[j], history[i]
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// ... (기존 enableCORS, getSystemStats, getContainers, restartContainer 함수는 그대로 유지!) ...
// (여기에 기존 함수들을 그대로 두시면 됩니다. 아래는 중복 생략을 위해 함수명만 적습니다)
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	// 기존 코드 그대로...
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
	// 기존 코드 그대로...
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
	// 기존 코드 그대로...
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	containers, err := cli.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var results []ContainerInfo
	for _, ctr := range containers {
		if len(ctr.Names) == 0 {
			continue
		}
		name := strings.TrimPrefix(ctr.Names[0], "/")
		if strings.Contains(name, "dash") {
			results = append(results, ContainerInfo{
				ID: ctr.ID, Name: name, State: ctr.State, Status: ctr.Status,
			})
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func restartContainer(w http.ResponseWriter, r *http.Request) {
	// 기존 코드 그대로... (고루틴 버전)
	if r.Method != "POST" {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}
	var req RestartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Restart command received. Restarting in 1 second...",
	})
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
	go func(targetID string) {
		time.Sleep(1 * time.Second)
		ctx := context.Background()
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			return
		}
		cli.ContainerRestart(ctx, targetID, nil)
	}(req.ContainerID)
}

// 컨테이너 로그 가져오기 API
func getContainerLogs(w http.ResponseWriter, r *http.Request) {
	// 1. 어떤 컨테이너의 로그를 볼지 ID 받기
	containerID := r.URL.Query().Get("id")
	if containerID == "" {
		http.Error(w, "Missing container id", http.StatusBadRequest)
		return
	}

	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 2. 로그 옵션 설정 (최근 100줄, 타임스탬프 포함)
	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       "100", // 마지막 100줄만 가져옴
		Timestamps: false,
	}

	// 3. 도커에게 로그 요청
	out, err := cli.ContainerLogs(ctx, containerID, options)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer out.Close()

	// 4. 로그 포맷 정리 (Docker 로그는 헤더가 섞여있어서 stdcopy로 발라내야 함)
	var logBuf bytes.Buffer
	// Stdout과 Stderr를 모두 logBuf에 담습니다.
	stdcopy.StdCopy(&logBuf, &logBuf, out)

	// 5. 결과 반환 (텍스트 그대로)
	w.Header().Set("Content-Type", "text/plain")
	w.Write(logBuf.Bytes())
}

// 청소부 함수: 1시간마다 실행되어, 24시간 지난 데이터 삭제
func startCleanupRoutine() {
	// 1시간 간격 타이머
	ticker := time.NewTicker(1 * time.Hour)

	go func() {
		for range ticker.C {
			fmt.Println("🧹 DB 청소 시작: 24시간 지난 데이터 삭제 중...")

			// PostgreSQL 문법: 현재시간(NOW)에서 1일(INTERVAL '1 day') 뺀 것보다 오래된(<) 데이터 삭제
			query := "DELETE FROM system_metrics WHERE created_at < NOW() - INTERVAL '1 day'"

			result, err := db.Exec(query)
			if err != nil {
				fmt.Printf("⚠️ 데이터 삭제 실패: %v\n", err)
			} else {
				rowsAffected, _ := result.RowsAffected()
				fmt.Printf("✅ 청소 완료: 오래된 데이터 %d개 삭제됨\n", rowsAffected)
			}
		}
	}()
}

func sendTelegramAlert(cpuVal, ramVal float64) {
	// 1. 쿨타임 체크 (10분)
	if time.Since(lastAlertTime) < 10*time.Minute {
		return
	}

	if telegramBotToken == "" || telegramChatID == "" {
		return
	}

	// 2. 메시지 내용 작성 (HTML 모드 사용 가능)
	messageText := fmt.Sprintf("🚨 <b>경고: 서버 부하 발생!</b>\n\n⚠️ <b>CPU:</b> %.2f%%\n⚠️ <b>RAM:</b> %.2f%%\n\n즉시 확인이 필요합니다!", cpuVal, ramVal)

	// 3. JSON 데이터 생성
	reqBody, _ := json.Marshal(map[string]string{
		"chat_id":    telegramChatID,
		"text":       messageText,
		"parse_mode": "HTML", // 굵은 글씨 등을 위해 HTML 모드 사용
	})

	// 4. 전송 (Telegram API)
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", telegramBotToken)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))

	if err != nil {
		fmt.Println("❌ 텔레그램 전송 실패:", err)
		return
	}
	defer resp.Body.Close()

	fmt.Println("🔔 텔레그램 알림 전송 완료!")
	lastAlertTime = time.Now()
}

// startMetricsRecorder 함수 수정
func startMetricsRecorder() {
	// 👇 [수정] 환경 변수 로드 변경
	telegramBotToken = os.Getenv("TELEGRAM_BOT_TOKEN")
	telegramChatID = os.Getenv("TELEGRAM_CHAT_ID")

	thresholdStr := os.Getenv("ALERT_THRESHOLD_CPU")
	if val, err := strconv.ParseFloat(thresholdStr, 64); err == nil {
		alertThreshold = val
	} else {
		alertThreshold = 80.0
	}

	ticker := time.NewTicker(5 * time.Second)
	go func() {
		for range ticker.C {
			cpuPercent, _ := cpu.Percent(time.Second, false)
			vMem, _ := mem.VirtualMemory()

			cpuVal := 0.0
			if len(cpuPercent) > 0 {
				cpuVal = math.Round(cpuPercent[0]*100) / 100
			}
			ramVal := math.Round(vMem.UsedPercent*100) / 100

			// 👇 [수정] 함수 호출 변경
			if cpuVal >= alertThreshold {
				sendTelegramAlert(cpuVal, ramVal)
			}

			if db != nil {
				_, err := db.Exec("INSERT INTO system_metrics (cpu, ram, created_at) VALUES ($1, $2, $3)", cpuVal, ramVal, time.Now())

				if err != nil {
					fmt.Println("⚠️ 데이터 저장 실패:", err)
				}
			}
		}
	}()
}

func triggerStress(w http.ResponseWriter, r *http.Request) {
	go func() {
		fmt.Println("🔥 스트레스 테스트 시작!")
		end := time.Now().Add(5 * time.Second)
		for time.Now().Before(end) {
			// CPU를 태우는 무의미한 연산
			_ = math.Sqrt(float64(time.Now().UnixNano()))
		}
		fmt.Println("✅ 스트레스 테스트 종료")
	}()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "CPU stress test started (5s)"})
}

func main() {
	// 1. DB 연결
	initDB()

	// 2. 기록 시작 (5초마다)
	startMetricsRecorder()

	// 3. 청소부 투입 (1시간마다)
	startCleanupRoutine()

	// 2. 라우터 설정
	http.HandleFunc("/api/status", enableCORS(getSystemStats))
	http.HandleFunc("/api/docker/list", enableCORS(getContainers))
	http.HandleFunc("/api/docker/restart", enableCORS(restartContainer))

	// 로그 API 등록
	http.HandleFunc("/api/docker/logs", enableCORS(getContainerLogs))

	// 이력 조회 API
	http.HandleFunc("/api/metrics/history", enableCORS(getMetricsHistory))

	http.HandleFunc("/api/debug/stress", enableCORS(triggerStress))

	fmt.Println("🚀 Go Backend Server running on port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
