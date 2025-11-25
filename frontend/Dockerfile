# 1. 의존성 설치 단계 (Deps)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. 빌드 단계 (Builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js 빌드 실행 (압축된 운영용 파일 생성)
RUN npm run build

# 3. 실행 단계 (Runner) - 가벼운 이미지
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 보안을 위해 nodejs 유저 사용
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 빌드된 파일만 복사해옴
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
# dev 대신 node로 직접 실행
CMD ["node", "server.js"]