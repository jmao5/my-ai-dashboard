package com.dash.trade.controller

import com.dash.trade.dto.MarketCapResponse
import com.dash.trade.dto.OverseasNewsResponse
import com.dash.trade.global.common.ApiResponse
import com.dash.trade.service.MartingaleService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class TradeController(
  private val martingaleService: MartingaleService
) {

  @GetMapping("/ranking")
  fun ranking(): ApiResponse<MarketCapResponse> {
    return ApiResponse.success(martingaleService.getMarketCapRanking())
  }

  @GetMapping("/news")
  fun news(): ApiResponse<OverseasNewsResponse> {
    // 기본값으로 요청 (오늘 날짜, 전체 뉴스)
    return ApiResponse.success(martingaleService.getOverseasNews())
  }
}
