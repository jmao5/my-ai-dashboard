package com.dash.trade.dto

import com.fasterxml.jackson.annotation.JsonProperty

// 1. 토큰 발급 요청 바디
data class TokenRequest(
    @JsonProperty("grant_type") val grantType: String = "client_credentials",
    @JsonProperty("appkey") val appKey: String,
    @JsonProperty("appsecret") val appSecret: String
)

// 2. 토큰 발급 응답
data class TokenResponse(
    @JsonProperty("access_token") val accessToken: String,
    @JsonProperty("expires_in") val expiresIn: Int
)

// 3. 거래량 순위 응답 (간소화)
data class RankingResponse(
    @JsonProperty("rt_cd") val rtCd: String, // 성공 실패 코드
    @JsonProperty("msg1") val msg1: String,  // 메시지
    @JsonProperty("output") val output: List<RankingItem>? // 데이터 리스트
)

// 4. 순위 개별 아이템
data class RankingItem(
    @JsonProperty("rank") val rank: String,      // 순위
    @JsonProperty("rsym") val symbol: String,    // 종목코드 (예: TSLA)
    @JsonProperty("kname") val name: String,     // 종목명
    @JsonProperty("last") val price: String,     // 현재가
    @JsonProperty("tvol") val volume: String     // 거래량
)

// 시가총액 순위 응답
data class MarketCapResponse(
    @JsonProperty("rt_cd") val rtCd: String,
    @JsonProperty("msg1") val msg1: String,
    @JsonProperty("output2") val output: List<MarketCapItem>? // 문서상 리스트는 output2 입니다.
)

// 시가총액 개별 아이템
data class MarketCapItem(
    @JsonProperty("rank") val rank: String,      // 순위
    @JsonProperty("rsym") val symbol: String,    // 종목코드 (예: DNASAAPL)
    @JsonProperty("name") val name: String,      // 종목명
    @JsonProperty("last") val price: String,     // 현재가
    @JsonProperty("tomv") val marketCap: String, // 시가총액
    @JsonProperty("rate") val rate: String,      // 등락율
    @JsonProperty("ename") val englishName: String // 영문명
)