from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # 👈 데이터 검사 도구 추가
import platform
import random # 👈 랜덤 답변용

app = FastAPI()

# ... (기존 CORS 설정 유지) ...
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. 채팅 메시지 형식 정의 (이렇게 생긴 데이터만 받겠다!)
class ChatRequest(BaseModel):
    message: str

@app.get("/")
def read_root():
    return {"message": "Python AI Server is Running!"}

@app.get("/api/ai-status")
def get_ai_status():
    return {
        "status": "Online",
        "model": "Basic-Bot v1.0",
        "system": f"Running on {platform.system()}",
        "message": "AI 엔진이 명령을 기다리고 있습니다."
    }

# 2. 채팅 API 추가 (POST 방식)
@app.post("/api/chat")
def chat_with_ai(request: ChatRequest):
    user_msg = request.message

    # 지금은 간단한 규칙 기반 봇이지만, 나중에 여기에 ChatGPT 등을 붙일 수 있습니다.
    ai_response = f"당신이 보낸 메시지: '{user_msg}' 잘 받았습니다!"

    if "안녕" in user_msg:
        ai_response = "안녕하세요! 무엇을 도와드릴까요?"
    elif "상태" in user_msg:
        ai_response = "현재 시스템 상태는 아주 양호합니다. (Go 서버 확인 됨)"
    elif "뉴스" in user_msg:
        ai_response = "최신 뉴스를 요약해 드릴까요? (기능 준비 중)"

    return {"reply": ai_response}

if __name__ == "__main__":
    import uvicorn
    # reload=True로 수정했던 부분 유지
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)