package com.devforge.sixpm.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

// Single-instance in-memory state: fine at this app's scale, resets on
// restart, and doesn't share counts across multiple backend instances.
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final ConcurrentHashMap<String, Long> lastRequestAtMillis = new ConcurrentHashMap<>();

    // Initializers also serve as defaults for direct construction (unit tests) — @Value only kicks in once Spring wires the bean.
    @Value("${app.rate-limit.enabled:true}")
    private boolean enabled = true;

    @Value("${app.rate-limit.window-millis:5000}")
    private long windowMillis = 5000;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        if (!enabled || !"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String clientId = resolveClientId(request);
        long now = System.currentTimeMillis();
        Long previous = lastRequestAtMillis.put(clientId, now);

        if (previous != null && now - previous < windowMillis) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"message\":\"너무 빠르게 제출했습니다. 잠시 후 다시 시도하세요.\"}");
            return false;
        }

        return true;
    }

    private String resolveClientId(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
