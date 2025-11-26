from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import database
import os
import google.generativeai as genai
import yfinance as yf
from apscheduler.schedulers.background import BackgroundScheduler
import requests
from datetime import datetime, timedelta
import math # 👈 [추가] 데이터 정제용

# 1. DB 초기화
database.Base.metadata.create_all(bind=database.engine)

# 2. Gemini 설정
GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
model = None

# 텔레그램 설정 로드
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

if not GOOGLE_API_KEY:
    print("⚠️ 경고: GEMINI_API_KEY가 없습니다. .env 파일을 확인하세요.")
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    target_model = 'gemini-2.5-flash' # 또는 gemini-1.5-flash
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

# --- 데이터 모델 정의 ---
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

# --- 스케줄러 로직 (1분마다 실행) ---
def fetch_market_data():
    db = database.SessionLocal()
    symbol = "NQ=F"

    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="1d", interval="1m")

        if data.empty:
            print("Market data empty")
            return

        # float 변환 필수 (numpy 타입 에러 방지)
        current_price = float(data['Close'].iloc[-1])

        # DB 저장
        new_price = database.MarketPrice(symbol=symbol, price=current_price)
        db.add(new_price)

        # 24시간 지난 데이터 삭제
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
            raw_prev_close = ticker.info.get('previousClose', data['Open'].iloc[0])
            prev_close = float(raw_prev_close)

            change_percent = ((current_price - prev_close) / prev_close) * 100

            if abs(change_percent) >= setting.threshold_percent:
                if not setting.last_alert_time or datetime.now() - setting.last_alert_time > timedelta(minutes=30):
                    direction = "떡상 🚀" if change_percent > 0 else "떡락 📉"
                    msg = f"<b>[나스닥 알림]</b>\n{direction} 감지!\n\n현재가: {current_price:.2f}\n변동률: {change_percent:.2f}%\n(설정값: {setting.threshold_percent}%)"
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

@app.get("/api/ai-status")
def get_ai_status():
    status = "Online" if model else "Offline"
    return {
        "status": status,
        "model": model.model_name if model else "None",
        "message": "AI가 준비되었습니다."
    }

@app.get("/api/chat/history")
def get_chat_history(db: Session = Depends(get_db)):
    history = db.query(database.ChatHistory).order_by(database.ChatHistory.id.desc()).limit(50).all()
    return [{"role": h.role, "text": h.message} for h in history[::-1]]

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        text_content = content.decode("utf-8")
        db_doc = database.Document(filename=file.filename, content=text_content)
        db.add(db_doc)
        db.commit()
        return {"message": f"파일 '{file.filename}' 학습 완료!", "preview": text_content[:100] + "..."}
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=400, detail="텍스트 파일만 가능합니다.")

@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    user_msg = request.message
    db_user_msg = database.ChatHistory(role="user", message=user_msg)
    db.add(db_user_msg)
    db.commit()

    ai_response = ""
    try:
        if not GOOGLE_API_KEY or not model:
            ai_response = "AI 모델 오류"
        else:
            latest_doc = db.query(database.Document).order_by(database.Document.id.desc()).first()
            context_prompt = ""
            if latest_doc:
                context_prompt = f"[참고 문서: {latest_doc.filename}]\n{latest_doc.content}\n---\n질문: {user_msg}"
            else:
                context_prompt = user_msg

            recent_history = db.query(database.ChatHistory).order_by(database.ChatHistory.id.desc()).limit(10).all()
            gemini_history = []
            for msg in reversed(recent_history):
                role = "user" if msg.role == "user" else "model"
                if msg.message == user_msg and msg.role == 'user': continue
                gemini_history.append({"role": role, "parts": [msg.message]})

            chat_session = model.start_chat(history=gemini_history)
            response = chat_session.send_message(context_prompt)
            ai_response = response.text
    except Exception as e:
        ai_response = f"Error: {str(e)}"
        print(f"Gemini Error: {e}")

    db_ai_msg = database.ChatHistory(role="bot", message=ai_response)
    db.add(db_ai_msg)
    db.commit()
    return {"reply": ai_response}

@app.post("/api/analyze/log")
async def analyze_log(request: AnalysisRequest):
    if not model: return {"reply": "AI 모델 로드 실패"}
    log_content = request.log_text[-5000:] if len(request.log_text) > 5000 else request.log_text
    prompt = f"System Admin Mode. Analyze this log:\n{log_content}"
    try:
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        return {"reply": f"Error: {str(e)}"}

# 👇 [위치 변경됨] 나스닥 관련 API들 (반드시 실행부보다 위에 있어야 함!)

@app.get("/api/market/history")
def get_market_history(db: Session = Depends(get_db)):
    prices = db.query(database.MarketPrice).order_by(database.MarketPrice.id.desc()).limit(60).all()
    return [{"time": p.timestamp.strftime("%H:%M"), "price": p.price} for p in prices[::-1]]

@app.get("/api/market/setting")
def get_market_setting(db: Session = Depends(get_db)):
    setting = db.query(database.MarketSetting).first()
    if not setting:
        return {"threshold": 1.0, "is_active": True}
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
    return {"message": "설정 저장됨"}

# 👇 [수정] 데이터 정제 로직이 추가된 차트 데이터 API
@app.post("/api/market/chart-data")
def get_realtime_chart(req: ChartRequest):
    try:
        ticker = yf.Ticker(req.symbol)
        df = ticker.history(period=req.range, interval=req.interval)

        if df.empty:
            return []

        chart_data = []
        for index, row in df.iterrows():
            # 🚨 [안전장치] NaN 데이터 건너뛰기
            if math.isnan(row['Open']) or math.isnan(row['Close']):
                continue

            time_str = index.strftime("%Y-%m-%d") if req.interval in ['1d', '1wk'] else index.strftime("%H:%M")

            chart_data.append({
                "time": time_str,
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })

        return chart_data

    except Exception as e:
        print(f"Chart Data Error: {e}")
        return []

# 👇 [가장 마지막] 실행부
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)