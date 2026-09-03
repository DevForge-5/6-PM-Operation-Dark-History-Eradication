package com.devforge.sixpm.ranking;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RankingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void submitAndListRankings() throws Exception {
        mockMvc.perform(post("/api/rankings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"테스트유저","endingId":"ending1","clearTimeMs":625000}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nickname", is("테스트유저")))
                .andExpect(jsonPath("$.rank", is(1)))
                .andExpect(jsonPath("$.saved", is(true)));

        mockMvc.perform(get("/api/rankings/ending1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nickname", is("테스트유저")));
    }

    @Test
    void rejectsBlankNickname() throws Exception {
        mockMvc.perform(post("/api/rankings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"","endingId":"ending1","clearTimeMs":625000}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsUnknownEndingId() throws Exception {
        mockMvc.perform(post("/api/rankings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"테스트유저","endingId":"boss","clearTimeMs":625000}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsNegativeClearTime() throws Exception {
        mockMvc.perform(post("/api/rankings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"테스트유저","endingId":"ending1","clearTimeMs":-1}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ranksByFastestTimeAndKeepsEndingsSeparate() throws Exception {
        submitRank("느린유저", "ending1", 800_000);
        submitRank("빠른유저", "ending1", 500_000);
        submitRank("다른엔딩유저", "ending2", 100);

        mockMvc.perform(get("/api/rankings/ending1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nickname", is("빠른유저")))
                .andExpect(jsonPath("$[1].nickname", is("느린유저")))
                .andExpect(jsonPath("$.length()", is(2)));

        mockMvc.perform(get("/api/rankings/ending2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nickname", is("다른엔딩유저")))
                .andExpect(jsonPath("$.length()", is(1)));
    }

    @Test
    void limitsResultsToTopTenAndReportsRankBeyondThat() throws Exception {
        for (int i = 0; i < 10; i += 1) {
            submitRank("유저" + i, "ending3", 1_000 + i);
        }

        mockMvc.perform(post("/api/rankings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"11등유저","endingId":"ending3","clearTimeMs":999999}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rank", is(11)))
                .andExpect(jsonPath("$.saved", is(false)));

        mockMvc.perform(get("/api/rankings/ending3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", is(10)));
    }

    private void submitRank(String nickname, String endingId, long clearTimeMs) throws Exception {
        mockMvc.perform(post("/api/rankings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"%s","endingId":"%s","clearTimeMs":%d}
                                """.formatted(nickname, endingId, clearTimeMs)))
                .andExpect(status().isCreated());
    }
}
