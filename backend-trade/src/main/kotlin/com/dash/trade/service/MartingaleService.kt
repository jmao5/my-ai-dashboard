package com.dash.trade.service

import com.dash.trade.dto.MarketCapResponse
import com.dash.trade.dto.TokenRequest
import com.dash.trade.dto.TokenResponse
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
  private val webClient = WebClient.builder()
    .baseUrl(baseUrl)
    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
    .build()

  private var accessToken: String = ""

  fun getAccessToken(): String {
    val request = TokenRequest(appKey = appKey, appSecret = appSecret)
    try {
      val response = webClient.post().uri("/oauth2/tokenP").bodyValue(request).retrieve()
        .bodyToMono(TokenResponse::class.java).block()

      return response?.accessToken?.also { accessToken = it }
        ?: throw TradeException("토큰 응답이 비어있습니다.", HttpStatus.BAD_GATEWAY)
    } catch (e: Exception) {
      throw TradeException("토큰 발급 실패: ${e.message}", HttpStatus.UNAUTHORIZED)
    }
  }

  fun getMarketCapRanking(): MarketCapResponse {
    if (accessToken.isEmpty()) getAccessToken()

    try {
      val response = webClient.get()
        .uri { it.path("/uapi/overseas-stock/v1/ranking/market-cap")
          .queryParam("AUTH", "").queryParam("EXCD", "NAS")
          .queryParam("KEYB", "").queryParam("VOL_RANG", "0").build()
        }
        .header("authorization", "Bearer $accessToken")
        .header("appkey", appKey).header("appsecret", appSecret)
        .header("tr_id", "HHDFS76350100").header("custtype", "P")
        .retrieve()
        .bodyToMono<MarketCapResponse>()
        .block()

      return response ?: throw TradeException("API 응답이 없습니다.", HttpStatus.BAD_GATEWAY)
    } catch (e: Exception) {
      throw TradeException("API 호출 중 오류: ${e.message}", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
