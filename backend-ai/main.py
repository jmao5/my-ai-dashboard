from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import database
import os
import google.generativeai as genai
import yfinance as yf
from apscheduler.schedulers.background import BackgroundScheduler
import requests
from datetime import datetime, timedelta
import math
from langchain_text_splitters import RecursiveCharacterTextSplitter
import pandas as pd

# 1. DB 초기화 및 벡터 익스텐션 활성화
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
    # 👇 [요청사항] 최신 모델 유지
    target_model = 'gemini-2.5-flash'
    try:
        model = genai.GenerativeModel(target_model)
        print(f"✅ AI 모델 '{target_model}' 로드 성공!")
    except Exception as e:
        print(f"❌ 모델 설정 실패: {e}")
        # 실패 시 안전한 구버전으로 폴백
        try:
            print("⚠️ 2.5 모델 로드 실패. 1.5-flash로 재시도합니다.")
            model = genai.GenerativeModel('gemini-1.5-flash')
        except:
            pass

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 데이터 모델 정의 ---
class ChatRequest(BaseModel):
    message: str
    model: str = "gemini-2.5-flash" # 기본값

class AnalysisRequest(BaseModel):
    log_text: str

class SettingRequest(BaseModel):
    threshold: float
    is_active: bool

class ChartRequest(BaseModel):
    symbol: str = "NQ=F"
    interval: str = "1m"
    range: str = "1d"

# --- 유틸리티 함수 ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def send_telegram_msg(text):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"})
    except Exception as e:
        print(f"Telegram Error: {e}")

# 텍스트를 벡터(숫자 배열)로 변환하는 함수
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

# --- 스케줄러 로직 (나스닥 등락 감지) ---
def fetch_market_data():
    db = database.SessionLocal()
    symbol = "NQ=F"

    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="1d", interval="1m")

        if data.empty:
            return

        # float 변환 필수
        current_price = float(data['Close'].iloc[-1])

        try:
            open_price = float(data['Open'].iloc[0])
        except:
            open_price = current_price

        # DB 저장
        new_price = database.MarketPrice(symbol=symbol, price=current_price)
        db.add(new_price)
        db.query(database.MarketPrice).filter(
            database.MarketPrice.timestamp < datetime.now() - timedelta(days=1)
        ).delete()
        db.commit()

        # 알림 체크
        setting = db.query(database.MarketSetting).first()
        if not setting:
            setting = database.MarketSetting(target_symbol=symbol, threshold_percent=1.0)
            db.add(setting)
            db.commit()

        if setting.is_active:
            change_percent = ((current_price - open_price) / open_price) * 100
            if abs(change_percent) >= setting.threshold_percent:
                if not setting.last_alert_time or datetime.now() - setting.last_alert_time > timedelta(minutes=30):
                    direction = "떡상 🚀" if change_percent > 0 else "떡락 📉"
                    msg = f"<b>[나스닥 알림]</b>\n{direction} 감지!\n\n현재가: {current_price:,.2f}\n변동률: {change_percent:.2f}%\n(설정값: {setting.threshold_percent}%)"
                    send_telegram_msg(msg)
                    setting.last_alert_time = datetime.now()
                    db.commit()
    except Exception as e:
        print(f"Market Fetch Error: {e}")
    finally:
        db.close()

@app.on_event("startup")
def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(fetch_market_data, 'interval', minutes=1)
    scheduler.start()

# --- API 엔드포인트 ---

@app.get("/")
def read_root():
    return {"message": "Gemini AI Server is Running!"}

@app.get("/api/ai/models")
def get_available_models():
    # 사용 가능한 모델 목록 반환 (2.5 포함)
    return ["gemini-2.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"]

@app.get("/api/ai-status")
def get_ai_status():
    status = "Online" if model else "Offline"
    model_name = "Unknown"
    if model:
        # model 객체 속성 접근 시 에러 방지
        try: model_name = model.model_name
        except: model_name = "Custom Loaded"

    return {
        "status": status,
        "model": model_name,
        "message": "AI가 준비되었습니다."
    }

@app.get("/api/chat/history")
def get_chat_history(db: Session = Depends(get_db)):
    history = db.query(database.ChatHistory).order_by(database.ChatHistory.id.desc()).limit(50).all()
    return [{
        "role": h.role,
        "text": h.message,
        "timestamp": h.timestamp.strftime("%Y-%m-%d %H:%M")
    } for h in history[::-1]]

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

# 👇 [최종 수정] 채팅 API (도구 설정 호환성 해결)
@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    user_msg = request.message
    selected_model_name = request.model

    print(f"🤖 요청 모델: {selected_model_name}")

    # 1. 기억 저장
    current_vector = get_embedding(user_msg)
    db_user_msg = database.ChatHistory(role="user", message=user_msg, embedding=current_vector)
    db.add(db_user_msg)
    db.commit()

    ai_response = ""
    try:
        if not GOOGLE_API_KEY:
            ai_response = "AI 모델 오류: API 키가 없습니다."
        else:
            # === 2. 모델 생성 및 도구 설정 ===
            # 가장 호환성이 높은 딕셔너리 방식으로 시도하되, 실패하면 도구 없이 생성하는 2단 구조
            current_model = None

            # 도구 설정 시도 (구글 검색)
            try:
                tools_config = [{"google_search": {}}]
                current_model = genai.GenerativeModel(selected_model_name, tools=tools_config)
            except Exception as e:
                print(f"⚠️ 검색 도구 설정 실패 (일반 모드로 전환): {e}")
                current_model = genai.GenerativeModel(selected_model_name)

            # === 3. RAG & Memory ===
            memory_context = ""
            if current_vector is not None:
                memories = db.query(database.ChatHistory) \
                    .filter(database.ChatHistory.role == 'user') \
                    .filter(database.ChatHistory.id != db_user_msg.id) \
                    .order_by(database.ChatHistory.embedding.l2_distance(current_vector)) \
                    .limit(3).all()
                if memories:
                    memory_context = "\n".join([f"- {m.message}" for m in memories])

            doc_context = ""
            if current_vector is not None:
                docs = db.query(database.DocumentChunk) \
                    .order_by(database.DocumentChunk.embedding.l2_distance(current_vector)) \
                    .limit(2).all()
                if docs:
                    doc_context = "\n".join([d.content for d in docs])

            # === 4. 프롬프트 ===
            system_prompt = f"""
            너는 사용자의 개인 서버를 관리하는 똑똑하고 센스 있는 AI 비서 'ServerBot'이야.
            
            [지침]
            1. 친구처럼 자연스럽게 대화해. (이모지 사용)
            2. 과거 기억이나 문서 내용을 자연스럽게 인용해.
            3. 모르는 정보(날씨, 주식 등)는 구글 검색 도구를 사용해. (도구 사용 불가 시 모른다고 솔직하게 답변)
            
            [기억]
            {memory_context if memory_context else "없음"}
            
            [문서]
            {doc_context if doc_context else "없음"}
            """

            # === 5. 단기 기억 ===
            recent_history = db.query(database.ChatHistory) \
                .order_by(database.ChatHistory.id.desc()).limit(10).all()

            gemini_history = []
            for msg in reversed(recent_history):
                role = "user" if msg.role == "user" else "model"
                if msg.message == user_msg and msg.role == 'user': continue
                gemini_history.append({"role": role, "parts": [msg.message]})

            # === 6. 채팅 및 전송 ===
            chat_session = current_model.start_chat(history=gemini_history)

            # 도구 관련 에러 발생 시 안전하게 처리하기 위한 try-except
            try:
                response = chat_session.send_message(f"{system_prompt}\n\n질문: {user_msg}")
                ai_response = response.text
            except Exception as e:
                # 만약 google_search 관련 에러(400 Unknown field 등)가 전송 중에 발생했다면?
                # 도구 없는 모델로 다시 시도
                print(f"⚠️ 전송 중 에러 발생. 도구 없이 재시도합니다. Error: {e}")
                fallback_model = genai.GenerativeModel(selected_model_name) # 도구 없음
                response = fallback_model.generate_content(f"{system_prompt}\n\n질문: {user_msg}")
                ai_response = response.text

    except Exception as e:
        ai_response = f"최종 에러 발생: {str(e)}"
        print(f"Gemini Critical Error: {e}")

    # 답변 저장
    db_ai_msg = database.ChatHistory(role="bot", message=ai_response)
    db.add(db_ai_msg)
    db.commit()

    return {"reply": ai_response, "used_model": selected_model_name}

# ... (나머지 나스닥, 로그 분석 API들은 그대로 유지) ...
# 기존 코드 하단의 API 함수들은 삭제하지 말고 그대로 두셔야 합니다!
# (get_market_history, get_market_setting, update_market_setting, get_realtime_chart, analyze_log 등)

# --- 로그 분석 ---
@app.post("/api/analyze/log")
async def analyze_log(request: AnalysisRequest):
    if not model: return {"reply": "AI 로드 실패"}
    log_content = request.log_text[-5000:] if len(request.log_text) > 5000 else request.log_text
    prompt = f"System Admin Mode. Analyze this log:\n{log_content}"
    try:
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        return {"reply": f"Error: {e}"}

# --- 나스닥 관련 API ---
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

@app.post("/api/market/chart-data")
def get_realtime_chart(req: ChartRequest):
    try:
        ticker = yf.Ticker(req.symbol)
        df = ticker.history(period=req.range, interval=req.interval)
        if df.empty: return []

        df['MA5'] = df['Close'].rolling(window=5).mean()
        df['MA20'] = df['Close'].rolling(window=20).mean()
        df['MA60'] = df['Close'].rolling(window=60).mean()
        df['MA120'] = df['Close'].rolling(window=120).mean()

        chart_data = []
        for index, row in df.iterrows():
            if math.isnan(row['Open']) or math.isnan(row['Close']): continue
            try:
                if index.tzinfo is None:
                    dt_kst = index.tz_localize('UTC').tz_convert('Asia/Seoul')
                else:
                    dt_kst = index.tz_convert('Asia/Seoul')
            except: dt_kst = index

            time_str = dt_kst.strftime("%Y-%m-%d") if req.interval in ['1d', '1wk', '1mo'] else dt_kst.strftime("%H:%M")

            vol = 0
            if 'Volume' in row and not math.isnan(row['Volume']): vol = int(row['Volume'])

            chart_data.append({
                "time": time_str,
                "open": float(row['Open']), "high": float(row['High']),
                "low": float(row['Low']), "close": float(row['Close']),
                "volume": vol,
                "ma5": float(row['MA5']) if 'MA5' in row and not math.isnan(row['MA5']) else None,
                "ma20": float(row['MA20']) if 'MA20' in row and not math.isnan(row['MA20']) else None,
                "ma60": float(row['MA60']) if 'MA60' in row and not math.isnan(row['MA60']) else None,
                "ma120": float(row['MA120']) if 'MA120' in row and not math.isnan(row['MA120']) else None
            })
        return chart_data
    except: return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)