# Build Stage (Gradle 공식 이미지 사용)
FROM gradle:8-jdk17-alpine AS build
WORKDIR /app
COPY . .
# 실행 권한 부여 (혹시 모를 에러 방지)
RUN chmod +x ./gradlew
RUN ./gradlew build -x test --no-daemon

# Run Stage (Amazon Corretto 사용 - 안정적)
FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENV TZ=Asia/Seoul
EXPOSE 9016
ENTRYPOINT ["java", "-jar", "app.jar"]