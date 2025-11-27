import axios from "axios";
import { API_CONFIG } from "@/config";

// 1. Go 백엔드 API 함수들
export const systemApi = {
  // 시스템 상태(CPU/RAM) 가져오기
  getStatus: async () => {
    // axios는 .json() 변환 과정이 필요 없고, data 안에 결과가 바로 들어있습니다.
    const response = await axios.get(`${API_CONFIG.GO_API_URL}/api/status`);
    return response.data;
  },

  // 도커 목록 가져오기
  getContainers: async () => {
    const response = await axios.get(
      `${API_CONFIG.GO_API_URL}/api/docker/list`,
    );
    return response.data;
  },

  // 컨테이너 재시작 요청
  restartContainer: async (containerId: string) => {
    const response = await axios.post(
      `${API_CONFIG.GO_API_URL}/api/docker/restart`,
      {
        containerId,
      },
    );
    return response.data;
  },

  // 그래프 데이터 가져오기
  getHistory: async () => {
    const response = await axios.get(
      `${API_CONFIG.GO_API_URL}/api/metrics/history`,
    );
    return response.data;
  },

  // 로그 가져오기 (텍스트 데이터를 받으므로 responseType: text)
  getLogs: async (containerId: string) => {
    const response = await axios.get(
      `${API_CONFIG.GO_API_URL}/api/docker/logs`,
      {
        params: { id: containerId },
        responseType: "text", // JSON이 아니라 텍스트 덩어리임
      },
    );
    return response.data;
  },

  triggerStress: async () => {
    await axios.post(`${API_CONFIG.GO_API_URL}/api/debug/stress`);
  },
};

// 2. Python AI 백엔드 API 함수들
export const aiApi = {
  // AI 서버 상태 확인
  getStatus: async () => {
    const response = await axios.get(`${API_CONFIG.AI_API_URL}/api/ai-status`);
    return response.data;
  },

  // 채팅 메시지 보내기
  sendMessage: async (message: string) => {
    const response = await axios.post(`${API_CONFIG.AI_API_URL}/api/chat`, {
      message,
    });
    return response.data;
  },
  // 채팅 기록 가져오기
  getHistory: async () => {
    const response = await axios.get(
      `${API_CONFIG.AI_API_URL}/api/chat/history`,
    );
    return response.data;
  },

  // 로그 분석 요청
  analyzeLog: async (logText: string) => {
    const response = await axios.post(
      `${API_CONFIG.AI_API_URL}/api/analyze/log`,
      {
        log_text: logText,
      },
    );
    return response.data;
  },

  // 파일 업로드
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      `${API_CONFIG.AI_API_URL}/api/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  },
};

// ... 기존 코드 ...

export const marketApi = {
  // 차트 데이터
  getHistory: async () => {
    const response = await axios.get(
      `${API_CONFIG.AI_API_URL}/api/market/history`,
    );
    return response.data;
  },
  // 설정
  getSetting: async () => {
    const response = await axios.get(
      `${API_CONFIG.AI_API_URL}/api/market/setting`,
    );
    return response.data;
  },
  // 설정 저장하기
  updateSetting: async (threshold: number, is_active: boolean) => {
    const response = await axios.post(
      `${API_CONFIG.AI_API_URL}/api/market/setting`,
      {
        threshold,
        is_active,
      },
    );
    return response.data;
  },

  // 차트 데이터 요청 (간격, 기간 설정 가능)
  getChartData: async (symbol: string, interval: string, range: string) => {
    const response = await axios.post(
      `${API_CONFIG.AI_API_URL}/api/market/chart-data`,
      {
        symbol: symbol, // 👈 여기가 핵심! (받아온 심볼을 넣음)
        interval,
        range,
      },
    );
    return response.data;
  },
};
