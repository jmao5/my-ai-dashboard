package com.dash.trade.service

import com.dash.trade.dto.*
import com.dash.trade.global.error.TradeException
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono

@Service
class MartingaleService(
  @Value("\${kis.base-url}") private val baseUrl: String,
  @Value("\${kis.app-key}") private val appKey: String,
  @Value("\${kis.app-secret}") private val appSecret: String
) {
  private val log = LoggerFactory.getLogger(this::class.java)

  // WebClient 설정
  private val webClient = WebClient.builder()
    .baseUrl(baseUrl)
    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
    .build()

  private var accessToken: String = ""

  /**
   * 토큰 발급 (기존 로직 유지)
   */
  fun getAccessToken(): String {
    val request = TokenRequest(appKey = appKey, appSecret = appSecret)
    try {
      val response = webClient.post()
        .uri("/oauth2/tokenP")
        .bodyValue(request)
        .retrieve()
        .bodyToMono<TokenResponse>()
        .block()

      return response?.accessToken?.also { accessToken = it }
        ?: throw TradeException("토큰 응답이 비어있습니다.", HttpStatus.BAD_GATEWAY)
    } catch (e: Exception) {
      log.error("토큰 발급 실패", e)
      throw TradeException("토큰 발급 실패: ${e.message}", HttpStatus.UNAUTHORIZED)
    }
  }

  /**
   * [해외주식-047] 시가총액 순위 조회
   */
  fun getMarketCapRanking(requestDto: MarketCapRequest = MarketCapRequest()): MarketCapResponse {
    // 1. 토큰 확인
    if (accessToken.isEmpty()) getAccessToken()

    // 2. API 정보 설정 (상수 관리 추천)
    val path = "/uapi/overseas-stock/v1/ranking/market-cap"
    val trId = "HHDFS76350100" // 실전투자용 Transaction ID

    try {
      val response = webClient.get()
        .uri { uriBuilder ->
          uriBuilder.path(path)
            .queryParam("AUTH", "")                 // 사용자권한정보 (공백)
            .queryParam("EXCD", requestDto.exchangeCode) // 거래소코드 (NAS, NYS)
            .queryParam("KEYB", requestDto.nextKey)      // 다음 키 버퍼
            .queryParam("VOL_RANG", requestDto.volumeRange) // 거래량 조건
            .build()
        }
        .header("authorization", "Bearer $accessToken")
        .header("appkey", appKey)
        .header("appsecret", appSecret)
        .header("tr_id", trId)
        .header("custtype", "P") // 개인
        .retrieve()
        .bodyToMono<MarketCapResponse>()
        .block()

      // 3. 응답 검증
      if (response == null) {
        throw TradeException("API 응답이 없습니다.", HttpStatus.BAD_GATEWAY)
      }

      // API는 성공(200)했지만, 비즈니스 로직상 실패인 경우 (rt_cd != "0")
      if (response.returnCode != "0") {
        throw TradeException("API 에러: ${response.message}", HttpStatus.BAD_REQUEST)
      }

      return response

    } catch (e: TradeException) {
      throw e
    } catch (e: Exception) {
      log.error("API 호출 중 시스템 오류", e)
      throw TradeException("API 호출 중 오류: ${e.message}", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
