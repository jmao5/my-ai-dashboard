package com.dash.trade.global.error
import org.springframework.http.HttpStatus

class TradeException(
  override val message: String,
  val status: HttpStatus = HttpStatus.BAD_REQUEST
) : RuntimeException(message)
