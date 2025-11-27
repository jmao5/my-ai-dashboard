from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text # SQL 실행용
import database
import os
import google.generativeai as genai
import yfinance as yf
from apscheduler.schedulers.background import BackgroundScheduler
import requests
from datetime import datetime, timedelta
import math
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 1. DB 초기화 및 벡터 익스텐션 활성화
# (pgvector 이미지를 쓰더라도 extension을 create 해줘야 함)
with database.engine.connect() as con:
    con.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    con.commit()

database.Base.metadata.create_all(bind=database.engine)

# 2. Gemini 설정
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
model = None

# 텔레그램 설정
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

if not GOOGLE_API_KEY:
    print("⚠️ 경고: GEMINI_API_KEY가 없습니다.")
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    target_model = 'gemini-2.5-flash'
    try:
        model = genai.GenerativeModel(target_model)
        print(f"✅ AI 모델 '{target_model}' 로드 성공!")
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

# --- 데이터 모델 ---
class ChatRequest(BaseModel):
    message: str

class AnalysisRequest(BaseModel):
    log_text: str

class SettingRequest(BaseModel):
    threshold: float
    is_active: bool

class ChartRequest(BaseModel):
    symbol: str = "NQ=F"
    interval: str = "1m"
    range: str = "1d"

# --- 유틸리티 ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def send_telegram_msg(text):
    # 1. 환경변수 확인 로그 (디버깅용)
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("❌ Telegram Error: 토큰이나 Chat ID가 없습니다.")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

    try:
        # 2. 요청 전송
        response = requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": text,
            "parse_mode": "HTML"
        })

        # 3.응답 상태 확인 (여기가 핵심!)
        if response.status_code == 200:
            print("✅ 텔레그램 전송 성공 (200 OK)")
        else:
            # 텔레그램이 거절한 이유를 출력
            print(f"❌ 텔레그램 전송 실패! 상태코드: {response.status_code}")
            print(f"👉 원인: {response.text}") # 에러 메시지 내용

    except Exception as e:
        print(f"❌ Telegram Network Error: {e}")

# 👇 [핵심] 텍스트를 벡터(숫자 배열)로 변환하는 함수
def get_embedding(text):
    if not GOOGLE_API_KEY: return None
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document",
        )
        return result['embedding']
    except Exception as e:
        print(f"Embedding Error: {e}")
        return None

# --- 스케줄러 (나스닥) ---
def fetch_market_data():
    db = database.SessionLocal()
    symbol = "NQ=F"

    try:
        ticker = yf.Ticker(symbol)
        # 1. 데이터 가져오기 (1일치)
        data = ticker.history(period="1d", interval="1m")

        if data.empty:
            print(f"⚠️ [{datetime.now().strftime('%H:%M:%S')}] Market data empty")
            return

        # 현재가 및 기준가(오늘 시초가) 계산
        current_price = float(data['Close'].iloc[-1])
        open_price = float(data['Open'].iloc[0]) # 오늘 장 시작 가격 (기준점)

        # 2. DB에 가격 저장 (기존 로직 유지)
        new_price = database.MarketPrice(symbol=symbol, price=current_price)
        db.add(new_price)
        db.query(database.MarketPrice).filter(
            database.MarketPrice.timestamp < datetime.now() - timedelta(days=1)
        ).delete()
        db.commit()

        # 3. 알림 체크
        setting = db.query(database.MarketSetting).first()
        if not setting:
            setting = database.MarketSetting(target_symbol=symbol, threshold_percent=1.0)
            db.add(setting)
            db.commit()

        if setting.is_active:
            # 등락률 계산 (현재가 - 시초가) / 시초가
            change_percent = ((current_price - open_price) / open_price) * 100

            # 👇 [디버깅용 로그] 이게 터미널에 찍힙니다.
            print(f"🔍 [Check] 현재가: {current_price} | 시초가: {open_price} | 변동률: {change_percent:.4f}% | 설정값: {setting.threshold_percent}%")

            # 알림 조건: 변동률의 절댓값이 설정값 이상일 때
            if abs(change_percent) >= setting.threshold_percent:
                # 쿨타임 로직 (30분)
                last_time = setting.last_alert_time
                if not last_time or datetime.now() - last_time > timedelta(minutes=30):

                    direction = "떡상 🚀" if change_percent > 0 else "떡락 📉"
                    msg = (
                        f"<b>[나스닥 변동 알림]</b>\n"
                        f"{direction} 감지!\n\n"
                        f"현재가: {current_price:,.2f}\n"
                        f"변동률: {change_percent:.2f}%\n"
                        f"(기준: 오늘 시초가 대비)\n"
                        f"(알림 설정: {setting.threshold_percent}%)"
                    )
                    send_telegram_msg(msg)

                    print("🔔 텔레그램 발송 완료!")
                    setting.last_alert_time = datetime.now()
                    db.commit()
                else:
                    print("⏳ 쿨타임 대기 중...")

    except Exception as e:
        print(f"❌ Market Fetch Error: {e}")
    finally:
        db.close()

@app.on_event("startup")
def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(fetch_market_data, 'interval', minutes=1)
    scheduler.start()

# --- API ---

@app.get("/")
def read_root():
    return {"message": "AI Server Running"}

@app.get("/api/ai-status")
def get_ai_status():
    return {"status": "Online" if model else "Offline", "model": str(model.model_name) if model else "None"}

@app.get("/api/chat/history")
def get_chat_history(db: Session = Depends(get_db)):
    history = db.query(database.ChatHistory).order_by(database.ChatHistory.id.desc()).limit(50).all()
    return [{"role": h.role, "text": h.message} for h in history[::-1]]

# 👇 [파일 업로드] 텍스트를 쪼개서 벡터로 저장
@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        text_content = content.decode("utf-8")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_text(text_content)

        for chunk in chunks:
            vector = get_embedding(chunk)
            if vector:
                db_chunk = database.DocumentChunk(filename=file.filename, content=chunk, embedding=vector)
                db.add(db_chunk)

        db.commit()
        return {"message": f"파일 '{file.filename}' 학습 완료! ({len(chunks)} 조각)", "preview": text_content[:50] + "..."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"업로드 실패: {str(e)}")

# 👇 [채팅] 장기 기억(DB 검색) + 문서 지식(RAG) 적용
@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    user_msg = request.message

    # 1. 현재 질문 벡터화
    current_vector = get_embedding(user_msg)

    # 2. 유저 메시지 DB 저장 (벡터 포함)
    db_user_msg = database.ChatHistory(role="user", message=user_msg, embedding=current_vector)
    db.add(db_user_msg)
    db.commit()

    ai_response = ""
    try:
        if not model:
            ai_response = "AI 모델 오류"
        else:
            # 3. 장기 기억 검색 (과거 내 대화 중 관련 있는 것 5개)
            memory_context = ""
            if current_vector is not None:
                # 나와 관련된 과거 대화(user 발화만) 중 가장 유사한 것 검색
                # (방금 저장한 최신 메시지는 제외)
                memories = db.query(database.ChatHistory) \
                    .filter(database.ChatHistory.role == 'user') \
                    .filter(database.ChatHistory.id != db_user_msg.id) \
                    .order_by(database.ChatHistory.embedding.l2_distance(current_vector)) \
                    .limit(5).all()
                memory_context = "\n".join([f"- {m.message}" for m in memories])

            # 4. 문서 지식 검색 (RAG)
            doc_context = ""
            if current_vector is not None:
                docs = db.query(database.DocumentChunk) \
                    .order_by(database.DocumentChunk.embedding.l2_distance(current_vector)) \
                    .limit(3).all()
                doc_context = "\n".join([d.content for d in docs])

            # 5. 시스템 프롬프트 구성
            system_prompt = f"""
            당신은 사용자의 오랜 파트너 AI입니다.
            
            [과거 대화 기억 (Memory)]
            {memory_context}
            
            [참고 문서 (Knowledge)]
            {doc_context}
            
            위 내용을 바탕으로 사용자의 질문에 답변하세요. 
            과거에 했던 말이나 문서를 인용하면 좋습니다.
            """

            # 6. 최근 대화(단기 기억) 10개 가져오기 (대화 흐름 유지용)
            recent_history = db.query(database.ChatHistory) \
                .order_by(database.ChatHistory.id.desc()).limit(10).all()

            gemini_history = []
            for msg in reversed(recent_history):
                role = "user" if msg.role == "user" else "model"
                if msg.message == user_msg and msg.role == 'user': continue
                gemini_history.append({"role": role, "parts": [msg.message]})

            # 7. 생성
            chat_session = model.start_chat(history=gemini_history)
            response = chat_session.send_message(f"{system_prompt}\n\n질문: {user_msg}")
            ai_response = response.text

    except Exception as e:
        ai_response = f"Error: {str(e)}"
        print(f"Gemini Error: {e}")

    # 8. 답변 저장
    db_ai_msg = database.ChatHistory(role="bot", message=ai_response)
    db.add(db_ai_msg)
    db.commit()

    return {"reply": ai_response}

# --- 기타 API (로그 분석, 나스닥 등) ---
@app.post("/api/analyze/log")
async def analyze_log(request: AnalysisRequest):
    if not model: return {"reply": "AI 로드 실패"}
    prompt = f"System Admin Mode. Analyze this log:\n{request.log_text[:5000]}"
    try:
        return {"reply": model.generate_content(prompt).text}
    except Exception as e:
        return {"reply": f"Error: {e}"}

@app.get("/api/market/history")
def get_market_history(db: Session = Depends(get_db)):
    prices = db.query(database.MarketPrice).order_by(database.MarketPrice.id.desc()).limit(60).all()
    return [{"time": p.timestamp.strftime("%H:%M"), "price": p.price} for p in prices[::-1]]

@app.get("/api/market/setting")
def get_market_setting(db: Session = Depends(get_db)):
    setting = db.query(database.MarketSetting).first()
    if not setting: return {"threshold": 1.0, "is_active": True}
    return {"threshold": setting.threshold_percent, "is_active": bool(setting.is_active)}

@app.post("/api/market/setting")
def update_market_setting(req: SettingRequest, db: Session = Depends(get_db)):
    setting = db.query(database.MarketSetting).first()
    if not setting:
        setting = database.MarketSetting(target_symbol="NQ=F")
        db.add(setting)
    setting.threshold_percent = req.threshold
    setting.is_active = 1 if req.is_active else 0
    db.commit()
    return {"message": "저장됨"}

# 차트 데이터 API
@app.post("/api/market/chart-data")
def get_realtime_chart(req: ChartRequest):
    try:
        ticker = yf.Ticker(req.symbol)
        df = ticker.history(period=req.range, interval=req.interval)

        if df.empty:
            return []

        # 📊 이동평균선 계산
        # 데이터가 적으면(예: 2개) MA20은 계산 안 되므로 NaN 처리됨
        df['MA5'] = df['Close'].rolling(window=5).mean()
        df['MA20'] = df['Close'].rolling(window=20).mean()
        df['MA60'] = df['Close'].rolling(window=60).mean()
        df['MA120'] = df['Close'].rolling(window=120).mean()

        chart_data = []
        for index, row in df.iterrows():
            if math.isnan(row['Open']) or math.isnan(row['Close']):
                continue

            # 시간대 변환 (UTC -> KST)
            try:
                if index.tzinfo is None:
                    dt_kst = index.tz_localize('UTC').tz_convert('Asia/Seoul')
                else:
                    dt_kst = index.tz_convert('Asia/Seoul')
            except Exception:
                dt_kst = index

            time_str = dt_kst.strftime("%Y-%m-%d") if req.interval in ['1d', '1wk', '1mo'] else dt_kst.strftime("%H:%M")

            chart_data.append({
                "time": time_str,
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume']),
                # 👇 [추가] 이동평균선 (NaN이면 None으로 보냄)
                "ma5": float(row['MA5']) if not math.isnan(row['MA5']) else None,
                "ma20": float(row['MA20']) if not math.isnan(row['MA20']) else None,
                "ma60": float(row['MA60']) if not math.isnan(row['MA60']) else None,
                "ma120": float(row['MA120']) if not math.isnan(row['MA120']) else None
            })

        return chart_data

    except Exception as e:
        print(f"Chart Data Error: {e}")
        return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)