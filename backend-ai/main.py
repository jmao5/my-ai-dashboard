from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
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

# 로그 분석 요청용 데이터 구조
class AnalysisRequest(BaseModel):
    log_text: str

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

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        # 파일 내용 읽기 (텍스트 파일이라고 가정)
        content = await file.read()
        text_content = content.decode("utf-8")

        # DB에 저장
        db_doc = database.Document(filename=file.filename, content=text_content)
        db.add(db_doc)
        db.commit()

        return {"message": f"파일 '{file.filename}' 학습 완료!", "preview": text_content[:100] + "..."}
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=400, detail="파일을 읽을 수 없습니다. 텍스트(.txt, .md, .conf) 파일만 가능합니다.")

# 👇 [수정] 채팅 API (지식 참조 기능 추가)
@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    user_msg = request.message

    # 1. 유저 메시지 DB 저장
    db_user_msg = database.ChatHistory(role="user", message=user_msg)
    db.add(db_user_msg)
    db.commit()

    ai_response = ""

    try:
        if not GOOGLE_API_KEY or not model:
            ai_response = "시스템 오류: AI 모델이 없습니다."
        else:
            # === 🧠 RAG 핵심 로직 ===
            # 가장 최근에 업로드된 문서를 가져옵니다 (간이 RAG)
            # 나중에는 Vector DB를 써서 관련된 것만 가져올 수 있습니다.
            latest_doc = db.query(database.Document).order_by(database.Document.id.desc()).first()

            context_prompt = ""
            if latest_doc:
                context_prompt = f"""
                [Reference Document: {latest_doc.filename}]
                {latest_doc.content}
                -----------------------------------
                위 문서를 참고하여 아래 사용자의 질문에 답변해 주세요.
                사용자 질문: {user_msg}
                """
            else:
                context_prompt = user_msg # 문서가 없으면 그냥 질문만
            # =========================

            # 대화 기록 가져오기 (기존 로직 유지)
            recent_history = db.query(database.ChatHistory) \
                .order_by(database.ChatHistory.id.desc()) \
                .limit(10).all()

            gemini_history = []
            for msg in reversed(recent_history):
                role = "user" if msg.role == "user" else "model"
                if msg.message == user_msg and msg.role == 'user': continue
                gemini_history.append({"role": role, "parts": [msg.message]})

            chat_session = model.start_chat(history=gemini_history)

            # 질문 전송 (문서 내용이 포함된 프롬프트 전송)
            response = chat_session.send_message(context_prompt)
            ai_response = response.text

    except Exception as e:
        ai_response = f"Error: {str(e)}"
        print(f"Gemini Error: {e}")

    # AI 답변 저장
    db_ai_msg = database.ChatHistory(role="bot", message=ai_response)
    db.add(db_ai_msg)
    db.commit()

    return {"reply": ai_response}

# 로그 분석 전용 API
@app.post("/api/analyze/log")
async def analyze_log(request: AnalysisRequest):
    log_content = request.log_text

    # 로그가 너무 길면 자릅니다 (토큰 제한 및 비용 절약)
    if len(log_content) > 5000:
        log_content = log_content[-5000:] # 뒤에서부터 5000자

    # 시스템 전문가 프롬프트 (페르소나 부여)
    prompt = f"""
    You are a Senior Linux System Administrator and DevOps Engineer.
    Please analyze the following server logs and provide a report in Korean(한국어).
    
    [Logs]
    {log_content}
    
    [Instructions]
    1. Summarize the key events.
    2. Identify any Errors or Warnings.
    3. Suggest specific solutions or commands to fix the issues.
    4. Use Markdown format (bold, code blocks).
    """

    try:
        if not model:
            return {"reply": "AI 모델이 로드되지 않아 분석할 수 없습니다."}

        response = model.generate_content(prompt)
        return {"reply": response.text}

    except Exception as e:
        print(f"Analysis Error: {e}")
        return {"reply": f"분석 중 오류가 발생했습니다: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)