package com.dash.trade.global.auth

import com.dash.trade.dto.TokenRequest
import com.dash.trade.dto.TokenResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient

@Component
class KisTokenManager(
  @Value("\${kis.base-url}") private val baseUrl: String,
  @Value("\${kis.app-key}") private val appKey: String,
  @Value("\${kis.app-secret}") private val appSecret: String
) {
  private val log = LoggerFactory.getLogger(this::class.java)
  private var currentToken: String? = null

  // 토큰 발급용 독립 WebClient (Feign Interceptor의 간섭을 피하기 위함)
  private val authClient = WebClient.create(baseUrl)

  /**
   * 유효한 액세스 토큰을 반환합니다.
   * 토큰이 없거나 만료되었다면 새로 발급받습니다.
   */
  fun getAccessToken(): String {
    if (currentToken.isNullOrBlank()) {
      refreshAccessToken()
    }
    return currentToken!!
  }

  @Synchronized // 동시 요청 시 중복 발급 방지
  private fun refreshAccessToken() {
    if (!currentToken.isNullOrBlank()) return

    log.info("KIS Access Token 발급 요청...")
    try {
      val request = TokenRequest(appKey = appKey, appSecret = appSecret)

      val response = authClient.post()
        .uri("/oauth2/tokenP")
        .bodyValue(request)
        .retrieve()
        .bodyToMono(TokenResponse::class.java)
        .block()

      currentToken = response?.accessToken
        ?: throw RuntimeException("토큰 응답이 비어있습니다.")

      log.info("토큰 발급 완료")
    } catch (e: Exception) {
      log.error("토큰 발급 실패", e)
      throw RuntimeException("토큰 발급 중 오류 발생: ${e.message}")
    }
  }
}
