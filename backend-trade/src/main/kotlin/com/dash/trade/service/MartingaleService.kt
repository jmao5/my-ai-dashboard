package com.dash.trade.service

import com.dash.trade.client.KisClient
import com.dash.trade.dto.MarketCapRequest
import com.dash.trade.dto.MarketCapResponse
import com.dash.trade.dto.OverseasNewsRequest
import com.dash.trade.dto.OverseasNewsResponse
import com.dash.trade.global.error.TradeException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service

@Service
class MartingaleService(
  private val kisClient: KisClient
) {
  private val log = LoggerFactory.getLogger(this::class.java)

  /**
   * [해외주식-047] 시가총액 순위 조회
   */
  fun getMarketCapRanking(requestDto: MarketCapRequest = MarketCapRequest()): MarketCapResponse {
    try {
      // authorization 파라미터 안 넘겨도 됨!
      val response = kisClient.getMarketCapRanking(
        trId = "HHDFS76350100",
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
    try {
      val response = kisClient.getOverseasNews(
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
