from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# 1. DB 접속 주소 (중요!)
# Docker 내부에서는 'localhost' 대신 서비스 이름인 'db'를 씁니다.
# docker-compose.yml에 설정한 user/password와 일치해야 합니다.
SQLALCHEMY_DATABASE_URL = "postgresql://myuser:mypassword@db:5432/dashboard_db"

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