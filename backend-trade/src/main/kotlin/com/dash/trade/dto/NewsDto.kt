package com.dash.trade.dto

import com.fasterxml.jackson.annotation.JsonProperty

/**
 * [요청] 해외뉴스 제목 조회 요청 파라미터
 * 공백("")으로 보내면 전체 조회입니다.
 */
data class OverseasNewsRequest(
  val queryDate: String = "",    // DATA_DT: 조회일자 (YYYYMMDD, 공백시 전체)
  val queryTime: String = "",    // DATA_TM: 조회시간 (HHMMSS, 공백시 전체)
  val symbol: String = "",       // SYMB: 종목코드 (공백시 전체)
  val nationCode: String = "",   // NATION_CD: 국가코드 (US, CN, HK 등, 공백시 전체)
  val nextKey: String = ""       // CTS: 다음 페이지 키 (처음엔 공백)
)

/**
 * [응답] 해외뉴스 응답 구조
 */
data class OverseasNewsResponse(
  @JsonProperty("rt_cd") val returnCode: String,
  @JsonProperty("msg1") val message: String,

  @JsonProperty("outblock1") val items: List<OverseasNewsItem>? // 실제 뉴스 리스트
)

/**
 * [응답 상세] 개별 뉴스 아이템
 */
data class OverseasNewsItem(
  @JsonProperty("news_key") val newsKey: String,  // 뉴스 키 (상세 조회용)
  @JsonProperty("title") val title: String,       // 제목

  @JsonProperty("data_dt") val date: String,      // 날짜 (YYYYMMDD)
  @JsonProperty("data_tm") val time: String,      // 시간 (HHMMSS)

  @JsonProperty("source") val source: String,     // 자료원 (예: 로이터 등)
  @JsonProperty("nation_cd") val nationCode: String, // 국가코드
  @JsonProperty("symb") val symbol: String,       // 종목코드
  @JsonProperty("symb_name") val symbolName: String // 종목명
)
