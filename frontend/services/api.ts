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
};
