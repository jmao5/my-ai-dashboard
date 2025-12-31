package com.dash.trade.global.config

import org.springframework.cloud.openfeign.EnableFeignClients
import org.springframework.context.annotation.Configuration

@Configuration
@EnableFeignClients(basePackages = ["com.dash.trade"])
class FeignConfig {
  // 추후 Feign 관련 전역 설정(Logger Level 등)이 필요하면 여기에 추가
}
