# 1. 빌드 단계
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# 실행 파일 하나로 컴파일 (CGO 끄고 리눅스용으로)
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# 2. 실행 단계 (아무것도 없는 텅 빈 이미지 사용 -> 초경량)
FROM scratch
WORKDIR /app
# 빌드된 파일만 가져옴
COPY --from=builder /app/main .
# HTTPS 통신을 위해 인증서 가져옴
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
# 컨테이너 시간대 설정을 위해 zoneinfo 가져옴 (선택)
COPY --from=builder /usr/local/go/lib/time/zoneinfo.zip /zoneinfo.zip
ENV ZONEINFO=/zoneinfo.zip

EXPOSE 8080
CMD ["./main"]