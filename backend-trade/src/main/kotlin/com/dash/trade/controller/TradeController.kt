package com.dash.trade.controller

import com.dash.trade.dto.RankingResponse
import com.dash.trade.service.MartingaleService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/test")
class TradeController(
    private val martingaleService: MartingaleService
) {

    // 1. 토큰 발급 테스트
    // 접속 주소: http://localhost:9016/api/test/token
    @GetMapping("/token")
    fun testToken(): String {
        return martingaleService.getAccessToken()
    }

    // 2. 랭킹 조회 테스트
    // 접속 주소: http://localhost:9016/api/test/ranking
    @GetMapping("/ranking")
    fun testRanking(): String {
        return martingaleService.getMarketCapRanking()
    }
}