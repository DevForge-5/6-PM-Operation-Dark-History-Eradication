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

@SpringBootTest
@AutoConfigureMockMvc
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
}
