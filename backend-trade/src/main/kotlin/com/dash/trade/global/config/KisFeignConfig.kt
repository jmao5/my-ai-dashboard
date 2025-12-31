package com.dash.trade.global.config

import feign.RequestInterceptor
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class KisFeignConfig(
  @Value("\${kis.app-key}") private val appKey: String,
  @Value("\${kis.app-secret}") private val appSecret: String
) {

  @Bean
  fun requestInterceptor(): RequestInterceptor {
    return RequestInterceptor { template ->
      // 모든 Feign 요청 헤더에 Key와 Secret 자동 주입
      template.header("appkey", appKey)
      template.header("appsecret", appSecret)
      template.header("content-type", "application/json; charset=utf-8")
    }
  }
}
