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

// @Transactional rolls each test's inserts back afterwards, so tests that
// assert on exact $[n] ranking order don't see leftovers from other tests
// regardless of execution order.
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RankingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void submitAndListRanks() throws Exception {
        mockMvc.perform(post("/api/rank")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"테스트유저","clearTimeMinutes":1025,"cringe":10,"endingType":"True"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nickname", is("테스트유저")));

        mockMvc.perform(get("/api/ranks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nickname", is("테스트유저")));
    }

    @Test
    void rejectsBlankNickname() throws Exception {
        mockMvc.perform(post("/api/rank")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"","clearTimeMinutes":1025,"cringe":10,"endingType":"True"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsCringeAboveMax() throws Exception {
        mockMvc.perform(post("/api/rank")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"테스트유저","clearTimeMinutes":1025,"cringe":150,"endingType":"True"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsBlankEndingType() throws Exception {
        mockMvc.perform(post("/api/rank")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"테스트유저","clearTimeMinutes":1025,"cringe":10,"endingType":""}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void returnsRanksSortedByClearTimeThenCringe() throws Exception {
        submitRank("느린유저", 1080, 50, "Bad");
        submitRank("빠른유저", 1000, 90, "True");
        submitRank("동률유저A", 1030, 40, "True");
        submitRank("동률유저B", 1030, 10, "True");

        mockMvc.perform(get("/api/ranks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nickname", is("빠른유저")))
                .andExpect(jsonPath("$[1].nickname", is("동률유저B")))
                .andExpect(jsonPath("$[2].nickname", is("동률유저A")))
                .andExpect(jsonPath("$[3].nickname", is("느린유저")));
    }

    @Test
    void limitsResultsToTopFive() throws Exception {
        for (int i = 0; i < 6; i++) {
            submitRank("유저" + i, 1000 + i, 10, "True");
        }

        mockMvc.perform(get("/api/ranks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", is(5)));
    }

    private void submitRank(String nickname, int clearTimeMinutes, int cringe, String endingType) throws Exception {
        mockMvc.perform(post("/api/rank")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"%s","clearTimeMinutes":%d,"cringe":%d,"endingType":"%s"}
                                """.formatted(nickname, clearTimeMinutes, cringe, endingType)))
                .andExpect(status().isCreated());
    }
}
