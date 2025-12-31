package com.dash.trade.global.common

import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonInclude
import org.springframework.http.HttpStatus

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ApiResponse<T>(
  val success: Boolean,
  val message: String? = null,
  val data: T? = null,

  // 핸들러가 HTTP 상태 코드를 설정하기 위해 사용 (JSON에서 제외)
  @JsonIgnore
  val status: HttpStatus = HttpStatus.OK
) {
  // JSON에 포함될 숫자 상태 코드 (예: 200, 404, 500)
  val code: Int
    get() = status.value()

  companion object {
    // 성공 응답 (200 OK) - 데이터 있음
    fun <T> success(data: T): ApiResponse<T> {
      return ApiResponse(true, null, data, HttpStatus.OK)
    }

    // 성공 응답 (200 OK) - 데이터 없음 (메시지만)
    fun success(message: String = "Success"): ApiResponse<Unit> {
      return ApiResponse(true, message, null, HttpStatus.OK)
    }

    // 실패 응답 (커스텀 상태 코드)
    fun error(status: HttpStatus, message: String): ApiResponse<Unit> {
      return ApiResponse(false, message, null, status)
    }
  }
}
