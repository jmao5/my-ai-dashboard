package com.dash.trade.client

import com.dash.trade.dto.MarketCapResponse
import com.dash.trade.dto.OverseasNewsResponse
import com.dash.trade.dto.TokenRequest
import com.dash.trade.dto.TokenResponse
import com.dash.trade.global.config.KisFeignConfig
import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.*

@FeignClient(name = "kisClient", url = "\${kis.base-url}", configuration = [KisFeignConfig::class])
interface KisClient {

  // 1. 토큰 발급 (POST)
  @PostMapping("/oauth2/tokenP")
  fun getAccessToken(@RequestBody request: TokenRequest): TokenResponse

  // 2. [해외주식-047] 시가총액 순위 (GET)
  @GetMapping("/uapi/overseas-stock/v1/ranking/market-cap")
  fun getMarketCapRanking(
    @RequestHeader("authorization") authorization: String, // Bearer Token
    @RequestHeader("tr_id") trId: String,                // Transaction ID
    @RequestHeader("custtype") custType: String = "P",   // 고객타입 (기본 P)

    // 쿼리 파라미터 매핑 (DTO 필드 -> API 파라미터명)
    @RequestParam("AUTH") auth: String = "",
    @RequestParam("EXCD") exchangeCode: String,
    @RequestParam("KEYB") nextKey: String,
    @RequestParam("VOL_RANG") volumeRange: String
  ): MarketCapResponse

  // 3. [해외주식-053] 해외뉴스 제목 (GET)
  @GetMapping("/uapi/overseas-price/v1/quotations/news-title")
  fun getOverseasNews(
    @RequestHeader("authorization") authorization: String,
    @RequestHeader("tr_id") trId: String,
    @RequestHeader("custtype") custType: String = "P",

    @RequestParam("INFO_GB") infoGb: String = "",
    @RequestParam("CLASS_CD") classCd: String = "",
    @RequestParam("NATION_CD") nationCode: String,
    @RequestParam("EXCHANGE_CD") exchangeCd: String = "",
    @RequestParam("SYMB") symbol: String,
    @RequestParam("DATA_DT") queryDate: String,
    @RequestParam("DATA_TM") queryTime: String,
    @RequestParam("CTS") nextKey: String
  ): OverseasNewsResponse
}
