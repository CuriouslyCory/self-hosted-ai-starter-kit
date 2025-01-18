const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const apiKey = "";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction:
    '# System Role\n\nYou are a highly skilled and detail-oriented document formatter with expertise in converting text into clean and consistent markdown format.\n\n# Task Specification\n\nFormat the given sections of a document into clean markdown. Apply specific formatting rules to ensure clarity, consistency, and the removal of unnecessary content.\n\n# Specifics and Context\n\nThis task is critical for creating a polished and professional markdown version of the document. By ensuring clean formatting, removing irrelevant content like page numbers, and presenting consistent chapter and section titles, you contribute to creating a document that is easy to read and structured for efficient use.\n\n## Formatting Rules:\n\n1. Treat a lowercase "l" at the beginning of a line as a bullet point.\n2. Identify and exclude page numbers formatted as `— 120 —`, `— xii —`, `— 1 —` from the output.\n3. For chapter and section title pages:\n   - Some title pages include the capitalized title and author name at the bottom of the page. Reformat these so that the title and author information appear at the **top** of the chapter or section.\n4. Omit the text "Mandate for Leadership: The Conservative Promise" when:\n   - It is the first line of text on a page.\n   - It appears on the line immediately after a page number.\n5. If the line immediately after a page number is the chapter title, omit the page number and retain only the title.\n6. Numbers on their own line sandwiched between text content are probably subtext and should be treated as such.\n7. Remove excess line breaks following clean markdown document formatting guidelines.\n   - Two new lines are still required between paragraphs.\n   - Only one new line between bullets and numbered list, and other list items.\n\n# Examples\n\n## Example 1\n\n**Input:**\n\n```\n— 1 —\nA PROMISE\nTO AMERICA\nKevin D. Roberts, PhD\n```\n\n**Output:**\n\n```\n## A PROMISE TO AMERICA\n**Kevin D. Roberts, PhD**\n```\n\n## Example 2\n\n**Input:**\n\n```\n— 23 —\nMandate for Leadership: The Conservative Promise\nl Review the budget framework\nl Evaluate key economic policies\n```\n\n**Output:**\n\n```\n- Review the budget framework\n- Evaluate key economic policies\n```\n\n## Example 3\n\n**Input:**\n\n```\n— 19 —\nSection One\nTAKING THE REINS\nOF GOVERNMENT\n```\n\n**Output:**\n\n```\n# SECTION ONE: TAKING THE REINS OF GOVERNMENT\n```\n\n## Example 4\n\n**Input:**\n\n```\n— 23 —\n1\nWHITE HOUSE OFFICE\nRick Dearborn\nF\nrom popular culture to academia, th ...cont...\n```\n\n**Output:**\n\n```\n### 1. WHITE HOUSE OFFICE\n**Rick Dearborn**\n\nFrom popular culture to academia, th ...cont...\n```\n\n## Example 5\n\n**Input:**\n\n```\n— 38 —\nMandate for Leadership: The Conservative Promise Unlike the other policy councils,\nthe NSC was established by statute.\n8\nStatutory members and advisers who are currently part of\nthe NSC include the President and Vice President; the Secretaries of State, Defense,\nand Energy; the Chairman of the Joint Chiefs of Staff; and the Director of National\nIntelligence.\n9\nThe NSC staff, and particularly the National Security Adviser, should be\nvetted for foreign and security policy experience and insight. The National Security\nAdviser and NSC staff advise the President on matters of foreign policy and\nnational security, serve as an information conduit in times of crisis, and as liaisons\nensuring that written communications are properly shared among NSC members.\n```\n\n**Output:**\n\n```\nUnlike the other policy councils, the NSC was established by statute. Statutory members and advisers who are currently part of the NSC include the President and Vice President; the Secretaries of State, Defense, and Energy; the Chairman of the Joint Chiefs of Staff; and the Director of National Intelligence.\n\nThe NSC staff, and particularly the National Security Adviser, should be vetted for foreign and security policy experience and insight. The National Security Adviser and NSC staff advise the President on matters of foreign policy and national security, serve as an information conduit in times of crisis, and as liaisons ensuring that written communications are properly shared among NSC members.\n```\n\n# Reminders\n\n- Always output the text in clean markdown format.\n- Remove all instances of page numbers.\n- Ensure that chapter or section titles, along with author names, appear consistently at the top of the section.\n- Omit the text "Mandate for Leadership: The Conservative Promise" according to the specified rules.\n- Treat any "l" at the beginning of a line as a bullet point (`-`).\n- Numbers on their own line in the middle of a sentence are usually meant to be subtext for citations.\n- Remove excess line breaks following clean markdown document formatting guidelines.',
  harmBlockThreshold: HarmBlockThreshold.BLOCK_NONE,
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const pageStart = 0; // what page to start on?
const maxIters = 2; // how many chunks to process'
const maxRetries = 2; // how many retries to process
const retryDelay = 2000; // how long to wait between retries

function getNewChatSession() {
  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });
  return chatSession;
}

async function run() {
  let { sections } = $input.first().json;
  // console.log(sections);

  let chatSession = getNewChatSession();

  const results = [];
  let chunkyCount = 0;

  // Loop over each section using "for of"
  sectionLoop: for (const section of sections) {
    if (parseInt(section.page) < pageStart) continue;
    // Loop over each subsection in the current section
    chunkLoop: for (const chunk of section.chunks) {
      if (!chunk) continue;
      chunkyCount++;
      console.log("count", chunkyCount);
      console.log("section.page", section.page);

      // Break out of this loop if we have processed 3 subsections
      if (chunkyCount > maxIters) {
        break sectionLoop;
      }

      // Build the prompt
      const prompt = `Section Title: ${
        section.title
      }\nAuthors: ${section.authors.join(", ")}\n\nSection Content\n${chunk}`;

      // console.log("prompt", prompt);

      // Reset the retry counter and result string
      let retry = 0;
      let result = "";
      while (retry < maxRetries && !result) {
        try {
          // This can throw errors such as "service busy"
          result = await chatSession.sendMessage(prompt);
          // console.log("result", result);

          // This can also throw errors such as Candidate was blocked due to SAFETY
          const content = result.response.text();

          // Add the result to the results array
          results.push({
            sectionId: section.id,
            title: section.title,
            authors: section.authors,
            content,
          });
          retry++;
        } catch (error) {
          // If we get an error, we need to wait for 2 seconds and try again
          console.log("error prompt", prompt);
          console.log("error", error);
          console.log("chatSession", JSON.stringify(chatSession, null, 2));

          // Reset the chat session so whatever caused the error is cleared from the history
          chatSession = getNewChatSession();

          // Wait for 2 seconds before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          retry++;
        }
      }
    }
  }

  // Merge the pages as best as possible
  const result = results.reduce((acc, result) => {
    const { content } = result;
    // last character of the previous chunk
    const lastChar = acc[acc.length - 1] ?? "";
    // first character of the current chunk
    const firstChar = content[0];

    // Ends with word, starts with word - join with a space
    if (firstChar.match(/[a-zA-Z]/) && lastChar.match(/[a-zA-Z]/)) {
      return `${acc} ${content}`;

      //  Ends with ",", ";", or ":" starts with word - join with a newline
    } else if (firstChar.match(/[,;:]/) && !lastChar.match(/[a-zA-Z]/)) {
      return `${acc}\n${content}`;

      //  Ends with punctuation, starts with word - join with a newline
    } else if (firstChar.match(/[.!?]/) && !lastChar.match(/[a-zA-Z]/)) {
      return `${acc}\n${content}`;

      // Ends with a hyphen, starts with word - remove hyphen and join with a newline
    } else if (firstChar.match(/-/) && !lastChar.match(/[a-zA-Z]/)) {
      return `${acc.slice(0, -1)}${content}`;

      // Ends with anything, starts with a number period (1., 2., 3., etc) - join with a newline
    } else if (lastChar.match(/[0-9]\./)) {
      return `${acc}\n${content}`;

      // Ends with anything, starts with a bullet point - join with a newline
    } else if (lastChar.match(/-\s/)) {
      return `${acc}\n${content}`;
    }
  }, "");

  // Optionally return or do something with "results"
  return [{ json: { result } }];
}

return run();
