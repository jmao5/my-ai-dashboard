from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from pgvector.sqlalchemy import Vector # 👈 벡터 DB 핵심 라이브러리

# Docker 환경 변수에서 DB 주소 가져오기
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://myuser:mypassword@db:5432/dashboard_db"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 1. 채팅 기록 (대화 내용 + 벡터 기억)
class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String)    # 'user' or 'bot'
    message = Column(String) # 실제 대화 내용
    # Gemini Embedding 모델(text-embedding-004)은 768차원입니다.
    # 사용자가 말한 내용의 '의미'를 숫자로 저장합니다.
    embedding = Column(Vector(768))
    timestamp = Column(DateTime, default=datetime.now)

# 2. 문서 지식 (업로드한 파일 내용 + 벡터 인덱스)
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    content = Column(Text)   # 쪼개진 텍스트 조각
    embedding = Column(Vector(768)) # 검색용 벡터
    timestamp = Column(DateTime, default=datetime.now)

# 3. 시장 가격 (나스닥 차트용)
class MarketPrice(Base):
    __tablename__ = "market_prices"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    price = Column(Float)
    timestamp = Column(DateTime, default=datetime.now)

# 4. 시장 알림 설정 (사용자 설정)
class MarketSetting(Base):
    __tablename__ = "market_settings"

    id = Column(Integer, primary_key=True, index=True)
    target_symbol = Column(String, default="NQ=F")
    threshold_percent = Column(Float, default=1.0)
    is_active = Column(Integer, default=1)
    last_alert_time = Column(DateTime, nullable=True)