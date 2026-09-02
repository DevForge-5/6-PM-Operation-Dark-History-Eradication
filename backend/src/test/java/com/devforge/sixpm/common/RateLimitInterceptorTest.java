package com.devforge.sixpm.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitInterceptorTest {

    @Test
    void blocksSecondRequestFromSameIpWithinWindow() throws Exception {
        RateLimitInterceptor interceptor = new RateLimitInterceptor();

        MockHttpServletRequest first = postRequestFrom("203.0.113.10");
        assertTrue(interceptor.preHandle(first, new MockHttpServletResponse(), new Object()));

        MockHttpServletRequest second = postRequestFrom("203.0.113.10");
        MockHttpServletResponse secondResponse = new MockHttpServletResponse();
        assertFalse(interceptor.preHandle(second, secondResponse, new Object()));
        assertEquals(429, secondResponse.getStatus());
    }

    @Test
    void allowsRequestsFromDifferentIps() throws Exception {
        RateLimitInterceptor interceptor = new RateLimitInterceptor();

        assertTrue(interceptor.preHandle(postRequestFrom("203.0.113.10"), new MockHttpServletResponse(), new Object()));
        assertTrue(interceptor.preHandle(postRequestFrom("198.51.100.20"), new MockHttpServletResponse(), new Object()));
    }

    @Test
    void ignoresNonPostRequests() throws Exception {
        RateLimitInterceptor interceptor = new RateLimitInterceptor();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/ranks");
        request.setRemoteAddr("203.0.113.10");

        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), new Object()));
    }

    private MockHttpServletRequest postRequestFrom(String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/rank");
        request.setRemoteAddr(ip);
        return request;
    }
}
