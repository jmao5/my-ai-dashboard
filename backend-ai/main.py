from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import database # 방금 만든 파일 import
import random

# 1. DB 테이블 생성 (서버 켜질 때 없으면 자동 생성)
database.Base.metadata.create_all(bind=database.engine)

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

# 2. DB 세션 가져오는 함수 (Dependency)
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Python AI Server with DB is Running!"}

@app.get("/api/ai-status")
def get_ai_status():
    return {
        "status": "Online",
        "message": "AI가 기억력을 가졌습니다! (DB 연동됨)"
    }

# 3. 채팅 기록 불러오기 API (GET)
@app.get("/api/chat/history")
def get_chat_history(db: Session = Depends(get_db)):
    # 최신순으로 정렬해서 가져오기 등은 나중에 추가 가능
    history = db.query(database.ChatHistory).all()
    # 프론트엔드 형식에 맞춰 변환
    return [{"role": h.role, "text": h.message} for h in history]

# 4. 채팅 주고받기 API (POST) - DB 저장 기능 추가
@app.post("/api/chat")
def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    user_msg = request.message

    # (1) 유저 메시지 DB 저장
    db_user_msg = database.ChatHistory(role="user", message=user_msg)
    db.add(db_user_msg)
    db.commit() # 저장 확정

    # (2) AI 답변 생성 logic
    ai_response = f"DB에 저장했습니다: '{user_msg}'"
    if "안녕" in user_msg:
        ai_response = "안녕하세요! 이전 대화 내용도 기억하고 있어요."

    # (3) AI 답변 DB 저장
    db_ai_msg = database.ChatHistory(role="bot", message=ai_response)
    db.add(db_ai_msg)
    db.commit()

    return {"reply": ai_response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)