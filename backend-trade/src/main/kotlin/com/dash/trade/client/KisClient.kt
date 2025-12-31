package com.dash.trade.client

import com.dash.trade.dto.MarketCapResponse
import com.dash.trade.dto.OverseasNewsResponse
import com.dash.trade.global.config.KisFeignConfig
import org.springframework.cloud.openfeign.FeignClient
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestParam

@FeignClient(name = "kisClient", url = "\${kis.base-url}", configuration = [KisFeignConfig::class])
interface KisClient {

  // 1. [해외주식-047] 시가총액 순위
  @GetMapping("/uapi/overseas-stock/v1/ranking/market-cap")
  fun getMarketCapRanking(
    // authorization 파라미터 삭제됨
    @RequestHeader("tr_id") trId: String,
    @RequestHeader("custtype") custType: String = "P",

    @RequestParam("AUTH") auth: String = "",
    @RequestParam("EXCD") exchangeCode: String,
    @RequestParam("KEYB") nextKey: String,
    @RequestParam("VOL_RANG") volumeRange: String
  ): MarketCapResponse

  // 2. [해외주식-053] 해외뉴스 제목
  @GetMapping("/uapi/overseas-price/v1/quotations/news-title")
  fun getOverseasNews(
    // authorization 파라미터 삭제됨
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
