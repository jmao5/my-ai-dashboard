package com.dash.trade.controller

import com.dash.trade.dto.MarketCapResponse
import com.dash.trade.global.common.ApiResponse
import com.dash.trade.service.MartingaleService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/test")
class TradeController(
  private val martingaleService: MartingaleService
) {

  @GetMapping("/ranking")
  fun testRanking(): ApiResponse<MarketCapResponse> {
    return ApiResponse.success(martingaleService.getMarketCapRanking())
  }
}
