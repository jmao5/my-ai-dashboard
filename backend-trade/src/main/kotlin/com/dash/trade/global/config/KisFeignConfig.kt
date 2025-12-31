package com.dash.trade.global.config

import com.dash.trade.global.auth.KisTokenManager
import feign.RequestInterceptor
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class KisFeignConfig(
  @Value("\${kis.app-key}") private val appKey: String,
  @Value("\${kis.app-secret}") private val appSecret: String,
  private val kisTokenManager: KisTokenManager // 매니저 주입
) {

  @Bean
  fun requestInterceptor(): RequestInterceptor {
    return RequestInterceptor { template ->
      // 1. 공통 헤더 주입
      template.header("appkey", appKey)
      template.header("appsecret", appSecret)
      template.header("content-type", "application/json; charset=utf-8")

      // 2. 토큰 자동 주입 (토큰 발급 URL 제외)
      // /oauth2/tokenP 요청에는 Bearer 토큰을 넣으면 안 됨
      if (!template.url().contains("/oauth2/tokenP")) {
        val token = kisTokenManager.getAccessToken()
        template.header("authorization", "Bearer $token")
      }
    }
  }
}
