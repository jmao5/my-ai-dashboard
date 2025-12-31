package com.dash.trade.global.error

import com.dash.trade.global.common.ApiResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

  private val log = LoggerFactory.getLogger(this::class.java)

  @ExceptionHandler(TradeException::class)
  fun handleTradeException(e: TradeException): ApiResponse<Unit> {
    log.warn("Business Error: ${e.message}")
    return ApiResponse.error(e.status, e.message)
  }

  @ExceptionHandler(Exception::class)
  fun handleException(e: Exception): ApiResponse<Unit> {
    log.error("System Error: ", e)
    return ApiResponse.error(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류: ${e.message}")
  }
}
