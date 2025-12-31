package com.dash.trade.dto

import com.fasterxml.jackson.annotation.JsonProperty

/**
 * [요청] 해외주식 시가총액 순위 요청 파라미터
 * 나중에 검색 조건이 바뀔 때 이 객체만 수정하면 됩니다.
 */
data class MarketCapRequest(
  val exchangeCode: String = "NAS", // EXCD: 거래소코드 (NAS:나스닥, NYS:뉴욕, AMS:아멕스)
  val volumeRange: String = "0",    // VOL_RANG: 거래량조건 (0:전체)
  val nextKey: String = ""          // KEYB: 다음 페이지 키 (처음엔 공백)
)

/**
 * [응답] 해외주식 시가총액 순위 전체 응답 구조
 */
data class MarketCapResponse(
  @JsonProperty("rt_cd") val returnCode: String, // 성공 실패 여부
  @JsonProperty("msg1") val message: String,     // 응답 메시지

  @JsonProperty("output1") val meta: MarketCapMeta?, // 응답 상세 1 (상태 정보 등)
  @JsonProperty("output2") val items: List<MarketCapItem>? // 응답 상세 2 (실제 랭킹 리스트)
)

/**
 * [응답 상세 1] 메타 데이터 (output1)
 */
data class MarketCapMeta(
  @JsonProperty("crec") val currentCount: String, // 현재 조회 종목 수
  @JsonProperty("trec") val totalCount: String,   // 전체 조회 종목 수
  @JsonProperty("zdiv") val decimalPlace: String  // 소수점 자리 수
)

/**
 * [응답 상세 2] 실제 랭킹 아이템 (output2)
 * API 문서의 약어를 읽기 쉬운 이름으로 매핑했습니다.
 */
data class MarketCapItem(
  @JsonProperty("rank") val rank: String,         // 순위
  @JsonProperty("rsym") val symbol: String,       // 실시간조회심볼 (예: DNAAAPL)
  @JsonProperty("symb") val shortSymbol: String,  // 종목코드
  @JsonProperty("name") val name: String,         // 종목명 (한글)
  @JsonProperty("ename") val englishName: String, // 영문 종목명

  @JsonProperty("last") val currentPrice: String, // 현재가
  @JsonProperty("diff") val priceChange: String,  // 대비 (전일 대비 가격 변동)
  @JsonProperty("rate") val changeRate: String,   // 등락율

  @JsonProperty("tvol") val volume: String,       // 거래량
  @JsonProperty("tomv") val marketCap: String,    // 시가총액
  @JsonProperty("shar") val listedShares: String, // 상장주식수
  @JsonProperty("grav") val weight: String        // 비중
)
