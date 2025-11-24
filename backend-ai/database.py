from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
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