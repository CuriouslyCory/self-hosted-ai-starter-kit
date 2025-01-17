const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction:
    '# System Role\nYou are a highly skilled and detail-oriented document formatter with expertise in converting text into clean and consistent markdown format.\n\n# Task Specification\nFormat the given sections of a document into clean markdown. Apply specific formatting rules to ensure clarity, consistency, and the removal of unnecessary content.\n\n# Specifics and Context\nThis task is critical for creating a polished and professional markdown version of the document. By ensuring clean formatting, removing irrelevant content like page numbers, and presenting consistent chapter and section titles, you contribute to creating a document that is easy to read and structured for efficient use.\n\n## Formatting Rules:\n1. Treat a lowercase "l" at the beginning of a line as a bullet point.\n2. Identify and exclude page numbers formatted as `— 120 —`, `— xii —`, `— 1 —` from the output.\n3. For chapter and section title pages:\n   - Some title pages include the capitalized title and author name at the bottom of the page. Reformat these so that the title and author information appear at the **top** of the chapter or section.\n4. Omit the text "Mandate for Leadership: The Conservative Promise" when:\n   - It is the first line of text on a page.\n   - It appears on the line immediately after a page number.\n5. If the line immediately after a page number is the chapter title, omit the page number and retain only the title.\n6. Numbers on their own line sandwiched between text content are probably subtext and should be treated as such.\n7. Remove excess line breaks following clean markdown document formatting guidelines (two are still required between paragraphs).\n\n# Examples\n## Example 1\n**Input:**\n```\n— 1 —\nMandate for Leadership: The Conservative Promise\nINTRODUCTION\nJOHN SMITH\n```\n\n**Output:**\n```\n# INTRODUCTION\n**John Smith**\n```\n\n## Example 2\n**Input:**\n```\n— 23 —\nMandate for Leadership: The Conservative Promise\nl Review the budget framework\nl Evaluate key economic policies\n```\n\n**Output:**\n```\n- Review the budget framework\n- Evaluate key economic policies\n```\n\n## Example 3\n**Input:**\n```\n— xii —\nMandate for Leadership: The Conservative Promise\nCHAPTER ONE\nTHE PATH FORWARD\n```\n\n**Output:**\n```\n# CHAPTER ONE: THE PATH FORWARD\n```\n\n## Example 4\n**Input:**\n```\n— 45 —\nAPPENDIX A\nJANE DOE\n```\n\n**Output:**\n```\n# APPENDIX A\n**Jane Doe**\n```\n\n# Reminders\n- Always output the text in clean markdown format.\n- Remove all instances of page numbers.\n- Ensure that chapter or section titles, along with author names, appear consistently at the top of the section.\n- Omit the text "Mandate for Leadership: The Conservative Promise" according to the specified rules.\n- Treat any "l" at the beginning of a line as a bullet point (`-`).',
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
const maxIters = 5000; // how many chunks to process

function sendMessage(prompt) {
  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });
  return chatSession.sendMessage(prompt);
}

async function run() {
  let { sections } = $input.first().json;
  // console.log(sections);

  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

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
      const prompt = `Title: ${section.title}\nAuthors: ${section.authors.join(
        ", "
      )}\n\nSection Content\n${chunk}`;

      // console.log("prompt", prompt);

      // Send the message to the chat session
      let retry = 0;
      let result = "";
      while (retry < 2 && !result) {
        try {
          // this can throw errors such as "service busy"
          result = await chatSession.sendMessage(prompt);
          // console.log("result", result);
          // this can also throw errors such as Candidate was blocked due to SAFETY
          results.push({
            sectionId: section.id,
            title: section.title,
            authors: section.authors,
            content: result.response.text(),
          });
          retry++;
        } catch (error) {
          // If we get an error, we need to wait for 2 seconds and try again
          console.log("error prompt", prompt);
          console.log("error", error);
          console.log("chatSession", JSON.stringify(chatSession, null, 2));
          await new Promise((resolve) => setTimeout(resolve, 2000));
          retry++;
        }
      }
    }
  }

  // Optionally return or do something with "results"
  return [
    { json: { result: results.map((result) => result.content).join("\n") } },
  ];
}

return run();
