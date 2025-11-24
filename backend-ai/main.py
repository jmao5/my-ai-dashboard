from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import database
import os
import google.generativeai as genai

# 1. DB 초기화
database.Base.metadata.create_all(bind=database.engine)

# 2. Gemini 설정 (중복 코드 제거 및 최신 모델 설정)
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
model = None

if not GOOGLE_API_KEY:
    print("⚠️ 경고: GEMINI_API_KEY가 없습니다. .env 파일을 확인하세요.")
else:
    genai.configure(api_key=GOOGLE_API_KEY)

    # 모델 고정 (가장 빠르고 최신인 flash 모델 추천)
    target_model = 'gemini-2.5-flash'

    print(f"🚀 AI 모델 '{target_model}' 로드 중...")
    try:
        model = genai.GenerativeModel(target_model)
        print("✅ 모델 로드 성공!")
    except Exception as e:
        print(f"❌ 모델 설정 실패: {e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Gemini AI Server is Running!"}

@app.get("/api/ai-status")
def get_ai_status():
    status = "Online" if model else "Offline"
    return {
        "status": status,
        "model": model.model_name if model else "None",
        "message": "AI가 이제 이전 대화를 기억합니다! 🧠"
    }

@app.get("/api/chat/history")
def get_chat_history(db: Session = Depends(get_db)):
    # 최신순으로 가져오되, 다시 시간순(과거->현재)으로 정렬해야 채팅창에 제대로 보임
    history = db.query(database.ChatHistory).order_by(database.ChatHistory.id.desc()).limit(50).all()
    # 파이썬 리스트 뒤집기 ([::-1]) -> 과거부터 현재 순서로
    return [{"role": h.role, "text": h.message} for h in history[::-1]]

# 3. 핵심: 채팅 API (기억력 추가됨)
@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    user_msg = request.message

    # (1) 유저 메시지 먼저 DB 저장 (기록용)
    db_user_msg = database.ChatHistory(role="user", message=user_msg)
    db.add(db_user_msg)
    db.commit()

    ai_response = ""

    try:
        if not GOOGLE_API_KEY or not model:
            ai_response = "API 키가 없거나 모델 로딩에 실패했습니다."
        else:
            # === 🔥 여기가 수정된 부분입니다 (기억력 주입) ===

            # 1. DB에서 최근 대화 내역 가져오기 (최근 10개 정도가 적당)
            # 너무 많이 가져오면 토큰 비용이 들거나 느려질 수 있음
            recent_history = db.query(database.ChatHistory) \
                .order_by(database.ChatHistory.id.desc()) \
                .limit(10) \
                .all()

            # 2. Gemini가 이해하는 형식으로 변환 (List[dict])
            # DB에서 가져온 건 최신순이므로 다시 뒤집어서(reversed) 시간순으로 만듦
            gemini_history = []
            for msg in reversed(recent_history):
                # 우리 DB의 role: 'user', 'bot'
                # Gemini의 role: 'user', 'model'
                role = "user" if msg.role == "user" else "model"

                # 방금 저장한 유저 메시지는 제외 (send_message할 때 보낼 거니까)
                # 하지만 DB에는 이미 저장했으므로, DB ID가 현재 저장한 것보다 작은 것만 가져오거나
                # 간단하게는 그냥 content만 리스트로 만듭니다.
                if msg.message == user_msg and msg.role == 'user':
                    continue

                gemini_history.append({"role": role, "parts": [msg.message]})

            # 3. 과거 기록을 담아서 채팅 세션 시작
            chat_session = model.start_chat(history=gemini_history)

            # 4. 질문 전송
            response = chat_session.send_message(user_msg)
            ai_response = response.text
            # ================================================

    except Exception as e:
        ai_response = f"에러 발생: {str(e)}"
        print(f"Gemini Error: {e}")

    # (3) AI 답변 DB 저장
    db_ai_msg = database.ChatHistory(role="bot", message=ai_response)
    db.add(db_ai_msg)
    db.commit()

    return {"reply": ai_response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)