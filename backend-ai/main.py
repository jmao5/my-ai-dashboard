from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import platform

app = FastAPI()

# 1. CORS 설정 (프론트엔드 9014에서 접속 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 보안상 나중에는 특정 도메인만 허용하는 게 좋습니다.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Python AI Server is Running!"}

@app.get("/api/ai-status")
def get_ai_status():
    # 나중에는 여기에 복잡한 AI 모델 로딩 상태를 넣습니다.
    return {
        "status": "Online",
        "model": "Basic-Bot v1.0",
        "system": f"Running on {platform.system()}",
        "message": "AI 엔진이 명령을 기다리고 있습니다."
    }

# 터미널에서 직접 실행할 때를 위한 설정 (Docker에서는 uvicorn 명령어로 실행됨)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)