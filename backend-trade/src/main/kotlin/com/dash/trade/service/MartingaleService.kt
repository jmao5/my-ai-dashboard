package com.dash.trade.service

import com.dash.trade.client.KisClient
import com.dash.trade.dto.*
import com.dash.trade.global.error.TradeException
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service

@Service
class MartingaleService(
  private val kisClient: KisClient, // Feign Client 주입
  @Value("\${kis.app-key}") private val appKey: String,
  @Value("\${kis.app-secret}") private val appSecret: String
) {
  private val log = LoggerFactory.getLogger(this::class.java)
  private var accessToken: String = ""

  /**
   * 토큰 발급
   */
  fun getAccessToken(): String {
    try {
      // Feign 호출: 아주 직관적입니다.
      val response = kisClient.getAccessToken(TokenRequest(appKey = appKey, appSecret = appSecret))

      return response.accessToken.also { accessToken = it }
    } catch (e: Exception) {
      log.error("토큰 발급 실패", e)
      // Feign은 기본적으로 에러 발생 시 예외를 던지므로 catch에서 처리
      throw TradeException("토큰 발급 실패: ${e.message}", HttpStatus.UNAUTHORIZED)
    }
  }

  /**
   * [해외주식-047] 시가총액 순위 조회
   */
  fun getMarketCapRanking(requestDto: MarketCapRequest = MarketCapRequest()): MarketCapResponse {
    if (accessToken.isEmpty()) getAccessToken()

    try {
      // WebClient의 복잡한 .uri().header().retrieve() 체이닝이 사라짐
      val response = kisClient.getMarketCapRanking(
        authorization = "Bearer $accessToken",
        trId = "HHDFS76350100",
        // DTO 값을 파라미터로 전달
        exchangeCode = requestDto.exchangeCode,
        nextKey = requestDto.nextKey,
        volumeRange = requestDto.volumeRange
      )

      if (response.returnCode != "0") {
        throw TradeException("API 에러: ${response.message}", HttpStatus.BAD_REQUEST)
      }
      return response

    } catch (e: TradeException) {
      throw e
    } catch (e: Exception) {
      log.error("시가총액 조회 실패", e)
      throw TradeException("API 호출 중 오류: ${e.message}", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * [해외주식-053] 해외뉴스 종합(제목) 조회
   */
  fun getOverseasNews(requestDto: OverseasNewsRequest = OverseasNewsRequest()): OverseasNewsResponse {
    if (accessToken.isEmpty()) getAccessToken()

    try {
      val response = kisClient.getOverseasNews(
        authorization = "Bearer $accessToken",
        trId = "HHPSTH60100C1",
        nationCode = requestDto.nationCode,
        symbol = requestDto.symbol,
        queryDate = requestDto.queryDate,
        queryTime = requestDto.queryTime,
        nextKey = requestDto.nextKey
      )

      if (response.returnCode != "0") {
        throw TradeException("API 에러: ${response.message}", HttpStatus.BAD_REQUEST)
      }
      return response

    } catch (e: TradeException) {
      throw e
    } catch (e: Exception) {
      log.error("뉴스 조회 실패", e)
      throw TradeException("뉴스 조회 중 오류: ${e.message}", HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
