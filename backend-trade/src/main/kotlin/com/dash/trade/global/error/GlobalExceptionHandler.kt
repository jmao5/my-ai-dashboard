package com.dash.trade.global.error

import com.dash.trade.global.common.ApiResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.servlet.resource.NoResourceFoundException

@RestControllerAdvice
class GlobalExceptionHandler {

  private val log = LoggerFactory.getLogger(this::class.java)

  // 1. 비즈니스 로직 예외 처리
  @ExceptionHandler(TradeException::class)
  fun handleTradeException(e: TradeException): ApiResponse<Unit> {
    log.warn("Business Error: ${e.message}")
    return ApiResponse.error(e.status, e.message)
  }

  // 2. 존재하지 않는 리소스(favicon 등) 요청 시 무시 (404 리턴)
  // 이 부분이 추가되어야 빨간색 에러 로그가 안 뜹니다.
  @ExceptionHandler(NoResourceFoundException::class)
  fun handleNoResourceFoundException(e: NoResourceFoundException): ApiResponse<Unit> {
    return ApiResponse.error(HttpStatus.NOT_FOUND, "존재하지 않는 리소스입니다: ${e.resourcePath}")
  }

  // 3. 기타 시스템 예외 처리 (500 Error)
  @ExceptionHandler(Exception::class)
  fun handleException(e: Exception): ApiResponse<Unit> {
    log.error("System Error: ", e)
    return ApiResponse.error(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류: ${e.message}")
  }
}
