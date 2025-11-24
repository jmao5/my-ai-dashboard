from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import database
import os
import google.generativeai as genai # 👈 구글 라이브러리

# 1. DB 초기화
database.Base.metadata.create_all(bind=database.engine)

# 2. Gemini 설정
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    print("⚠️ 경고: GEMINI_API_KEY가 설정되지 않았습니다!")
else:
    genai.configure(api_key=GOOGLE_API_KEY)

# 사용할 모델 선택
if not GOOGLE_API_KEY:
    print("⚠️ 경고: GEMINI_API_KEY가 없습니다. .env 파일을 확인하세요.")
else:
    genai.configure(api_key=GOOGLE_API_KEY)

    # 👇 [수정] 고민할 것 없이 'gemini-2.5-flash'로 고정!
    # (목록에 있는 이름 그대로 사용)
    target_model = 'gemini-2.5-flash'

    print(f"🚀 최신 모델 '{target_model}'을 로드합니다...")
    try:
        model = genai.GenerativeModel(target_model)
        print("✅ 모델 로드 성공!")
    except Exception as e:
        print(f"❌ 모델 설정 실패: {e}")
        print("   혹시 API 키 권한 문제일 수 있습니다.")

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
    status = "Online" if GOOGLE_API_KEY else "Key Missing"
    return {
        "status": status,
        "model": "Google Gemini Pro",
        "message": "진짜 인공지능이 준비되었습니다."
    }

@app.get("/api/chat/history")
def get_chat_history(db: Session = Depends(get_db)):
    # 최근 50개만 가져오기 (너무 많으면 느리니까)
    history = db.query(database.ChatHistory).order_by(database.ChatHistory.id.asc()).limit(50).all()
    return [{"role": h.role, "text": h.message} for h in history]

# 3. 핵심: 채팅 API (Gemini 연동)
@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    user_msg = request.message

    # (1) 유저 메시지 DB 저장
    db_user_msg = database.ChatHistory(role="user", message=user_msg)
    db.add(db_user_msg)
    db.commit()

    try:
        # (2) Gemini에게 질문 던지기
        if not GOOGLE_API_KEY:
            ai_response = "API 키가 없어서 대답할 수 없어요. docker-compose.yml을 확인해주세요."
        else:
            # generate_content가 실제 구글 서버로 질문을 보냅니다.
            response = model.generate_content(user_msg)
            ai_response = response.text

    except Exception as e:
        ai_response = f"생각하다가 에러가 났어요: {str(e)}"
        print(f"Gemini Error: {e}")

    # (3) AI 답변 DB 저장
    db_ai_msg = database.ChatHistory(role="bot", message=ai_response)
    db.add(db_ai_msg)
    db.commit()

    return {"reply": ai_response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)