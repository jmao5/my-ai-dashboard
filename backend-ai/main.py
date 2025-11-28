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
    target_model = 'gemini-2.5-flash' # 또는 gemini-1.5-flash
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

# --- 데이터 모델 정의 ---
class ChatRequest(BaseModel):
    message: str
    model: str = "gemini-2.5-flash"

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
            # 기준가 계산 (오늘 시초가 기준)
            try:
                open_price = float(data['Open'].iloc[0])
            except:
                open_price = current_price # 예외 시 현재가 사용 (알림 안 가도록)

            change_percent = ((current_price - open_price) / open_price) * 100

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
    return [{
        "role": h.role,
        "text": h.message,
        "timestamp": h.timestamp.strftime("%Y-%m-%d %H:%M")
    } for h in history[::-1]]

# [파일 업로드] RAG
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
        return {"message": f"파일 '{file.filename}' 학습 완료!", "preview": text_content[:50] + "..."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"업로드 실패: {str(e)}")

# 👇 [신규 추가] 사용 가능한 모델 목록 반환 API
@app.get("/api/ai/models")
def get_available_models():
    if not GOOGLE_API_KEY:
        return []
    try:
        # generateContent를 지원하는 Gemini 모델만 필터링
        models = [
            m.name.replace("models/", "")
            for m in genai.list_models()
            if 'generateContent' in m.supported_generation_methods and 'gemini' in m.name
        ]
        # 최신순 정렬 (내림차순)
        models.sort(reverse=True)
        return models
    except Exception as e:
        print(f"Model List Error: {e}")
        return ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"] # 에러 시 기본 목록

# [채팅]
@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    user_msg = request.message
    selected_model_name = request.model

    print(f"🤖 [Model Check] 요청 모델: {selected_model_name}")

    # 1. 벡터화 및 DB 저장
    current_vector = get_embedding(user_msg)
    db_user_msg = database.ChatHistory(role="user", message=user_msg, embedding=current_vector)
    db.add(db_user_msg)
    db.commit()

    ai_response = ""
    try:
        if not model: # 전역 model 객체 체크 (기본 로딩 확인용)
            ai_response = "AI 모델 오류: 초기화되지 않았습니다."
        else:
            # ✨ [핵심 1] 구글 검색 도구 장착! (인터넷 연결)
            # 사용자가 선택한 모델에 'google_search' 도구를 달아서 새로 생성합니다.
            tools_config = [
                {"google_search": {}}
            ]

            # 만약 위 방식도 안 되면 아예 tools 설정을 빼고
            # 순수 LLM 모드로 동작하게 try-except로 감싸는 게 안전합니다.
            try:
                current_model = genai.GenerativeModel(selected_model_name, tools=tools_config)
            except Exception as tool_error:
                print(f"⚠️ Tool Error (검색 기능 비활성화): {tool_error}")
                # 에러 나면 도구 없이 깡통 모델로 생성
                current_model = genai.GenerativeModel(selected_model_name)

            # === 🧠 관련 기억 검색 (Long-term Memory) ===
            memory_context = ""
            if current_vector is not None:
                memories = db.query(database.ChatHistory) \
                    .filter(database.ChatHistory.role == 'user') \
                    .filter(database.ChatHistory.id != db_user_msg.id) \
                    .order_by(database.ChatHistory.embedding.l2_distance(current_vector)) \
                    .limit(3).all() # 너무 많이 가져오면 헷갈려하므로 3개로 줄임

                if memories:
                    memory_context = "\n".join([f"- {m.message}" for m in memories])

            # === 📂 문서 지식 검색 (RAG) ===
            doc_context = ""
            if current_vector is not None:
                docs = db.query(database.DocumentChunk) \
                    .order_by(database.DocumentChunk.embedding.l2_distance(current_vector)) \
                    .limit(2).all()
                if docs:
                    doc_context = "\n".join([d.content for d in docs])

            # ✨ [핵심 2] 프롬프트 대수술 (자연스러운 대화 유도)
            # XML 태그를 줄이고, 친구같은 어조를 강조합니다.
            system_prompt = f"""
            너는 사용자의 개인 서버를 관리하는 똑똑하고 센스 있는 AI 파트너 'ServerBot'이야.
            
            [너의 성격과 행동 지침]
            1. **친구처럼 대화해:** 딱딱한 보고서 말투보다는 "해요/했어요" 같은 부드러운 구어체를 써. 이모지(😊, 🚀)도 적절히 섞어서 생동감 있게 말해줘.
            2. **모르면 검색해:** 날씨, 주식, 최신 뉴스 같은 정보는 네가 가진 '구글 검색 도구'를 써서 실시간 정보를 찾아봐.
            3. **기억력:** 아래 [기억]과 [문서]는 네가 알고 있는 배경지식이야. 대화 흐름에 맞을 때만 자연스럽게 언급해. 억지로 끼워 맞추지 마.
            4. **전문성:** 코딩이나 서버 문제는 정확하고 간결하게 해결책을 줘.

            [우리의 지난 대화 기억]
            {memory_context if memory_context else "없음"}

            [참고 문서 내용]
            {doc_context if doc_context else "없음"}
            """

            # 단기 기억 (흐름 유지)
            recent_history = db.query(database.ChatHistory) \
                .order_by(database.ChatHistory.id.desc()).limit(10).all()

            gemini_history = []
            for msg in reversed(recent_history):
                role = "user" if msg.role == "user" else "model"
                if msg.message == user_msg and msg.role == 'user': continue
                gemini_history.append({"role": role, "parts": [msg.message]})

            # 채팅 시작
            chat_session = current_model.start_chat(history=gemini_history)

            # 질문 전송
            response = chat_session.send_message(f"{system_prompt}\n\n사용자: {user_msg}")
            ai_response = response.text

    except Exception as e:
        ai_response = f"앗, 문제가 생겼어! 😅\n(Error: {str(e)})"
        print(f"Gemini Error: {e}")

    # 답변 저장
    db_ai_msg = database.ChatHistory(role="bot", message=ai_response)
    db.add(db_ai_msg)
    db.commit()

    return {
        "reply": ai_response,
        "used_model": selected_model_name
    }

# 👇 [수정] 한국어 로그 분석 API
@app.post("/api/analyze/log")
async def analyze_log(request: AnalysisRequest):
    if not model: return {"reply": "AI 로드 실패"}

    log_content = request.log_text[-5000:] if len(request.log_text) > 5000 else request.log_text

    # 한국어 프롬프트 적용
    prompt = f"""
    당신은 유능한 시니어 시스템 관리자입니다.
    아래 로그를 분석하여 **반드시 한국어**로 보고서를 작성하세요.
    
    [로그 내용]
    {log_content}
    
    [요청사항]
    1. 핵심 요약 (무슨 일이 있었는지)
    2. 에러 및 경고 원인 분석
    3. 구체적인 해결 명령어 또는 방안 제안
    4. 가독성 좋은 마크다운 형식 사용
    """

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

# 차트 데이터 API (디버깅 및 안전장치 강화)
@app.post("/api/market/chart-data")
def get_realtime_chart(req: ChartRequest):
    try:
        # 1. 데이터 가져오기
        ticker = yf.Ticker(req.symbol)
        df = ticker.history(period=req.range, interval=req.interval)

        # 🚨 [디버깅 로그] 데이터가 비어있으면 로그 출력
        if df.empty:
            print(f"⚠️ [Chart Warning] '{req.symbol}' 데이터가 없습니다. (Range: {req.range}, Interval: {req.interval})")
            return []

        # 이동평균선 계산 (데이터가 충분할 때만)
        if len(df) >= 5: df['MA5'] = df['Close'].rolling(window=5).mean()
        if len(df) >= 20: df['MA20'] = df['Close'].rolling(window=20).mean()
        if len(df) >= 60: df['MA60'] = df['Close'].rolling(window=60).mean()
        if len(df) >= 120: df['MA120'] = df['Close'].rolling(window=120).mean()

        chart_data = []
        for index, row in df.iterrows():
            # 데이터 유효성 검사 완화
            # 가격 정보가 없으면 스킵하지만, 거래량은 없어도 됨
            if math.isnan(row['Open']) or math.isnan(row['Close']):
                continue

            # 시간대 변환 (UTC -> KST)
            try:
                if index.tzinfo is None:
                    dt_kst = index.tz_localize('UTC').tz_convert('Asia/Seoul')
                else:
                    dt_kst = index.tz_convert('Asia/Seoul')
            except:
                dt_kst = index # 실패 시 원본 사용

            time_str = dt_kst.strftime("%Y-%m-%d") if req.interval in ['1d', '1wk', '1mo'] else dt_kst.strftime("%H:%M")

            # 거래량 NaN 처리 (0으로 대체)
            vol = 0
            if 'Volume' in row and not math.isnan(row['Volume']):
                vol = int(row['Volume'])

            chart_data.append({
                "time": time_str,
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": vol,
                # MA 값이 NaN이면 None으로 (JSON 변환 시 에러 방지)
                "ma5": float(row['MA5']) if 'MA5' in row and not math.isnan(row['MA5']) else None,
                "ma20": float(row['MA20']) if 'MA20' in row and not math.isnan(row['MA20']) else None,
                "ma60": float(row['MA60']) if 'MA60' in row and not math.isnan(row['MA60']) else None,
                "ma120": float(row['MA120']) if 'MA120' in row and not math.isnan(row['MA120']) else None
            })

        # 최종 데이터 개수 확인
        # print(f"✅ [Chart Success] {req.symbol}: {len(chart_data)} rows loaded.")

        return chart_data

    except Exception as e:
        print(f"❌ Chart Data Error ({req.symbol}): {e}")
        return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)