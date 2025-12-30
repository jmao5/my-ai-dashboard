FROM gradle:jdk17-alpine AS build
WORKDIR /app
COPY . .
RUN ./gradlew build -x test --no-daemon

FROM openjdk:17-alpine
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENV TZ=Asia/Seoul
EXPOSE 9016
ENTRYPOINT ["java", "-jar", "app.jar"]