package com.dash.trade.service

import com.dash.trade.dto.RankingResponse
import com.dash.trade.dto.TokenRequest
import com.dash.trade.dto.TokenResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.client.WebClient

@Service
class MartingaleService(
    @Value("\${kis.base-url}") private val baseUrl: String,
    @Value("\${kis.base-url-order}") private val baseUrlOrder: String,
    @Value("\${kis.app-key}") private val appKey: String,
    @Value("\${kis.app-secret}") private val appSecret: String
) {
    private val log = LoggerFactory.getLogger(this::class.java)

    private val webClient = WebClient.builder()
        .baseUrl(baseUrl)
        .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .build()

    private var accessToken: String = ""

    // 1. 토큰 발급 (기존 코드 유지)
    fun getAccessToken(): String {
        // ... (이전과 동일하므로 생략, 필요하면 다시 적어드릴게요) ...
        // 일단 토큰이 없으면 발급받는 로직은 있다고 가정합니다.
        log.info("🔑 토큰 발급 요청...")
        val request = TokenRequest(appKey = appKey, appSecret = appSecret)

        // 간략화된 토큰 로직
        val response = webClient.post().uri("/oauth2/tokenP").bodyValue(request).retrieve()
            .bodyToMono(TokenResponse::class.java).block()

        if (response != null) {
            accessToken = response.accessToken
            return accessToken
        }
        return ""
    }

    /**
     * 2단계: 해외주식 시가총액 상위 조회 [해외주식-047]
     */
    fun getMarketCapRanking(): String {
        if (accessToken.isEmpty()) {
            getAccessToken()
        }

        // 🚨 [중요] 문서에 명시된 정보
        // URL: /uapi/overseas-stock/v1/ranking/market-cap
        // TR_ID: HHDFS76350100 (실전 전용)
        val path = "/uapi/overseas-stock/v1/ranking/market-cap"
        val trId = "HHDFS76350100"

        log.info("📊 시가총액 순위 조회 요청 중... (TR_ID: $trId)")

        try {
            val response = webClient.get()
                .uri { uriBuilder ->
                    uriBuilder
                        .path(path)
                        .queryParam("AUTH", "")       // [필수] 사용자권한정보 (공백)
                        .queryParam("EXCD", "NAS")    // [필수] 거래소코드 (NAS:나스닥, NYS:뉴욕)
                        .queryParam("KEYB", "")       // [필수] NEXT KEY BUFF (공백)
                        .queryParam("VOL_RANG", "0")  // [필수] 거래량조건 (0:전체)
                        .build()
                }
                .header("authorization", "Bearer $accessToken") // [필수] 접근토큰
                .header("appkey", appKey)       // [필수] 앱키
                .header("appsecret", appSecret) // [필수] 앱시크릿
                .header("tr_id", trId)          // [필수] 거래ID
                .header("custtype", "P")        // [필수] 고객타입 (P:개인)
                .retrieve()
                .bodyToMono(String::class.java) // ⚠️ 디버깅을 위해 String으로 받음
                .block()

            log.info("✅ Raw 응답 데이터: $response")
            return response ?: "응답 없음"
        } catch (e: Exception) {
            log.error("❌ 조회 실패: ${e.message}")
            return "에러 발생: ${e.message}"
        }
    }
}