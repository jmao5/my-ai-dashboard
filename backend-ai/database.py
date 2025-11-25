from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from sqlalchemy import Float # 👈 Float 추가
import os

# 환경 변수에서 DB 주소 가져오기 (없으면 기본값 사용 - 안전장치)
# docker-compose.yml에서 DATABASE_URL을 넘겨주기로 했으므로 그걸 씁니다.
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://myuser:mypassword@db:5432/dashboard_db"
)

# 2. 연결 엔진 생성
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 3. 세션 생성기 (데이터를 주고받는 통로)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. 모델의 기본 클래스
Base = declarative_base()

# 5. 채팅 기록 테이블 정의 (Schema)
class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String) # 'user' 또는 'bot'
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    content = Column(String) # 파일의 텍스트 내용
    timestamp = Column(DateTime, default=datetime.utcnow)

# 👇 [추가] 시장 가격 기록 (차트용)
class MarketPrice(Base):
    __tablename__ = "market_prices"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True) # 예: NQ=F
    price = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

# 👇 [추가] 알림 설정 저장 (사용자 설정)
class MarketSetting(Base):
    __tablename__ = "market_settings"

    id = Column(Integer, primary_key=True, index=True)
    target_symbol = Column(String, default="NQ=F")
    # 상한/하한 알림 퍼센트 (예: 1.5면 +1.5% 이상 오르거나 -1.5% 이하로 떨어질 때)
    threshold_percent = Column(Float, default=1.0)
    is_active = Column(Integer, default=1) # 1: 켜짐, 0: 꺼짐
    last_alert_time = Column(DateTime, nullable=True) # 도배 방지용