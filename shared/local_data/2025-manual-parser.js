/*************************************************
 * DEPENDENCIES
 *************************************************/
const { getEncoding, encodingForModel } = require("js-tiktoken");

/*************************************************
 * CONSTANTS
 *************************************************/

// This regex extracts text by page markers like "— xii —", "— 14 —", etc.
const PAGE_MARKER_REGEX =
  /(—\s[ivxlcdmIVXLCDM0-9]*\s—)\s*([^]*?)(?=(—\s[ivxlcdmIVXLCDM0-9]*\s—|$))/g;

/*************************************************
 * HELPERS
 *************************************************/

/**
 * parsePages
 *
 * Splits input text by page markers (e.g., "— xii —", "— 14 —"), returning
 * an object keyed by page label (e.g. "xii", "14") with:
 * {
 *   page: string,    // e.g. "14"
 *   chapter: string, // defaulted to the first line or forced via overrides
 *   text: string     // entire content for that page
 * }
 *
 * @param {string} input - The full text to parse.
 * @param {Object.<string, string>} [overrides={}] - Map of page labels to forced chapter names.
 * @returns {Object.<string, { page: string, chapter: string, text: string }>}
 */
function parsePages(input, overrides = {}) {
  const results = {};
  let match;

  while ((match = PAGE_MARKER_REGEX.exec(input)) !== null) {
    // Example: match[1] -> "— xii —", match[2] -> text until next marker.
    const rawLabel = match[1].trim().slice(1, -1).trim(); // e.g. "xii" or "14"
    const pageText = match[2].trim();
    const textLines = pageText.split(/\r?\n/);

    // The first line often identifies a chapter heading—override if specified
    const firstLine = textLines[0] || "";
    const forcedChapter = overrides[rawLabel];
    const guessedChapter = forcedChapter || firstLine;

    results[rawLabel] = {
      page: rawLabel,
      chapter: guessedChapter,
      text: pageText,
    };
  }

  return results;
}

/**
 * chunkSectionByTokens
 *
 * Splits a text string into chunks, each up to `maxTokens` tokens,
 * using an already-initialized tokenizer from js-tiktoken.
 *
 * @param {string} text - The text to chunk.
 * @param {number} maxTokens - The maximum tokens allowed per chunk.
 * @param {object} tokenizer - The tokenizer object from js-tiktoken.
 * @returns {string[]} - Array of chunked strings, each <= maxTokens tokens.
 */
function chunkSectionByTokens(text, maxTokens, tokenizer) {
  const tokenIds = tokenizer.encode(text);
  const chunks = [];
  let currentChunkTokens = [];

  for (const token of tokenIds) {
    if (currentChunkTokens.length >= maxTokens) {
      chunks.push(tokenizer.decode(currentChunkTokens));
      currentChunkTokens = [];
    }
    currentChunkTokens.push(token);
  }

  // Push the final chunk if it has any tokens left
  if (currentChunkTokens.length > 0) {
    chunks.push(tokenizer.decode(currentChunkTokens));
  }

  return chunks;
}

/*************************************************
 * TABLE OF CONTENTS (NEW STRUCTURE)
 *************************************************/
/**
 * Here is the new Table of Contents (TOC) you provided.
 * Each top-level entry has:
 *   - id
 *   - title
 *   - page (number)
 *   - authors (array of strings)
 */
const TABLE_OF_CONTENTS = [
  {
    id: "foreword",
    title: "FOREWORD: A PROMISE TO AMERICA",
    page: 1,
    authors: [],
  },
  {
    id: "foreword",
    title: "FOREWORD: A PROMISE TO AMERICA",
    page: 1,
    authors: ["Kevin D. Roberts, PhD"],
  },
  {
    id: "section-1",
    title: "SECTION 1: TAKING THE REINS OF GOVERNMENT",
    page: 19,
    authors: [],
  },
  {
    id: "section-1",
    title: "1. WHITE HOUSE OFFICE",
    page: 23,
    authors: ["Rick Dearborn"],
  },
  {
    id: "section-1",
    title: "2. EXECUTIVE OFFICE OF THE PRESIDENT OF THE UNITED STATES",
    page: 43,
    authors: ["Russ Vought"],
  },
  {
    id: "section-1",
    title: "3. CENTRAL PERSONNEL AGENCIES: MANAGING THE BUREAUCRACY",
    page: 69,
    authors: ["Donald Devine", "Dennis Dean Kirk", "Paul Dans"],
  },
  {
    id: "section-2",
    title: "SECTION 2: THE COMMON DEFENSE",
    page: 87,
    authors: [],
  },
  {
    id: "section-2",
    title: "4. DEPARTMENT OF DEFENSE",
    page: 91,
    authors: ["Christopher Miller"],
  },
  {
    id: "section-2",
    title: "5. DEPARTMENT OF HOMELAND SECURITY",
    page: 133,
    authors: ["Ken Cuccinelli"],
  },
  {
    id: "section-2",
    title: "6. DEPARTMENT OF STATE",
    page: 171,
    authors: ["Kiron K. Skinner"],
  },
  {
    id: "section-2",
    title: "7. INTELLIGENCE COMMUNITY",
    page: 201,
    authors: ["Dustin J. Carmack"],
  },
  {
    id: "section-2",
    title: "8. MEDIA AGENCIES",
    page: 235,
    authors: [],
  },
  {
    id: "section-2",
    title: "U.S. AGENCY FOR GLOBAL MEDIA",
    page: 235,
    authors: ["Mora Namdar"],
  },
  {
    id: "section-2",
    title: "CORPORATION FOR PUBLIC BROADCASTING",
    page: 246,
    authors: ["Mike Gonzalez"],
  },
  {
    id: "section-2",
    title: "9. AGENCY FOR INTERNATIONAL DEVELOPMENT",
    page: 253,
    authors: ["Max Primorac"],
  },
  {
    id: "section-3",
    title: "SECTION 3: THE GENERAL WELFARE",
    page: 283,
    authors: [],
  },
  {
    id: "section-3",
    title: "10. DEPARTMENT OF AGRICULTURE",
    page: 289,
    authors: ["Daren Bakst"],
  },
  {
    id: "section-3",
    title: "11. DEPARTMENT OF EDUCATION",
    page: 319,
    authors: ["Lindsey M. Burke"],
  },
  {
    id: "section-3",
    title: "12. DEPARTMENT OF ENERGY AND RELATED COMMISSIONS",
    page: 363,
    authors: ["Bernard L. McNamee"],
  },
  {
    id: "section-3",
    title: "13. ENVIRONMENTAL PROTECTION AGENCY",
    page: 417,
    authors: ["Mandy M. Gunasekara"],
  },
  {
    id: "section-3",
    title: "14. DEPARTMENT OF HEALTH AND HUMAN SERVICES",
    page: 449,
    authors: ["Roger Severino"],
  },
  {
    id: "section-3",
    title: "15. DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT",
    page: 503,
    authors: ["Benjamin S. Carson, Sr., MD"],
  },
  {
    id: "section-3",
    title: "16. DEPARTMENT OF THE INTERIOR",
    page: 517,
    authors: ["William Perry Pendley"],
  },
  {
    id: "section-3",
    title: "17. DEPARTMENT OF JUSTICE",
    page: 545,
    authors: ["Gene Hamilton"],
  },
  {
    id: "section-3",
    title: "18. DEPARTMENT OF LABOR AND RELATED AGENCIES",
    page: 581,
    authors: ["Jonathan Berry"],
  },
  {
    id: "section-3",
    title: "19. DEPARTMENT OF TRANSPORTATION",
    page: 619,
    authors: ["Diana Furchtgott-Roth"],
  },
  {
    id: "section-3",
    title: "20. DEPARTMENT OF VETERANS AFFAIRS",
    page: 641,
    authors: ["Brooks D. Tucker"],
  },
  {
    id: "section-4",
    title: "SECTION 4: THE ECONOMY",
    page: 657,
    authors: [],
  },
  {
    id: "section-4",
    title: "21. DEPARTMENT OF COMMERCE",
    page: 663,
    authors: ["Thomas F. Gilman"],
  },
  {
    id: "section-4",
    title: "22. DEPARTMENT OF THE TREASURY",
    page: 691,
    authors: ["William L. Walton", "Stephen Moore", "David R. Burton"],
  },
  {
    id: "section-4",
    title: "23. EXPORT–IMPORT BANK",
    page: 717,
    authors: [],
  },
  {
    id: "section-4",
    title: "THE EXPORT–IMPORT BANK SHOULD BE ABOLISHED",
    page: 717,
    authors: ["Veronique de Rugy"],
  },
  {
    id: "section-4",
    title: "THE CASE FOR THE EXPORT–IMPORT BANK",
    page: 724,
    authors: ["Jennifer Hazelton"],
  },
  {
    id: "section-4",
    title: "24. FEDERAL RESERVE",
    page: 731,
    authors: ["Paul Winfree"],
  },
  {
    id: "section-4",
    title: "25. SMALL BUSINESS ADMINISTRATION",
    page: 745,
    authors: ["Karen Kerrigan"],
  },
  {
    id: "section-4",
    title: "26. TRADE",
    page: 765,
    authors: [],
  },
  {
    id: "section-4",
    title: "THE CASE FOR FAIR TRADE",
    page: 765,
    authors: ["Peter Navarro"],
  },
  {
    id: "section-4",
    title: "THE CASE FOR FREE TRADE",
    page: 796,
    authors: ["Kent Lassman"],
  },
  {
    id: "section-5",
    title: "SECTION 5: INDEPENDENT REGULATORY AGENCIES",
    page: 825,
    authors: [],
  },
  {
    id: "section-5",
    title: "27. FINANCIAL REGULATORY AGENCIES",
    page: 829,
    authors: [],
  },
  {
    id: "section-5",
    title: "SECURITIES AND EXCHANGE COMMISSION AND RELATED AGENCIES",
    page: 829,
    authors: ["David R. Burton"],
  },
  {
    id: "section-5",
    title: "CONSUMER FINANCIAL PROTECTION BUREAU",
    page: 837,
    authors: ["Robert Bowes"],
  },
  {
    id: "section-5",
    title: "28. FEDERAL COMMUNICATIONS COMMISSION",
    page: 845,
    authors: ["Brendan Carr"],
  },
  {
    id: "section-5",
    title: "29. FEDERAL ELECTION COMMISSION",
    page: 861,
    authors: ["Hans A. von Spakovsky"],
  },
  {
    id: "section-5",
    title: "30. FEDERAL TRADE COMMISSION",
    page: 869,
    authors: ["Adam Candeub"],
  },
  {
    id: "onward",
    title: "ONWARD!",
    page: 883,
    authors: [],
  },
  {
    id: "onward",
    title: "ONWARD!",
    page: 883,
    authors: ["Edwin J. Feulner"],
  },
];

/*************************************************
 * MERGE TOC + PAGES
 *************************************************/
/**
 * mergeTocWithPages
 *
 * For each TOC entry in the *flattened* structure, gather the text from all pages
 * starting at `entry.page` up to (but not including) the next TOC entry’s page.
 * Then we chunk that combined text with js-tiktoken, attaching the result to `chunks`.
 *
 * @param {Array} toc - The *flattened* Table of Contents array, where each entry is { id, title, page, authors }.
 * @param {Object} pages - The object from parsePages(), keyed by page label (e.g. "19") => { page, text, ... }.
 * @param {Function} tokenizer - The tokenizer from js-tiktoken, e.g. encodingForModel("gpt-4").
 * @param {number} [maxTokens=4000] - Maximum tokens per chunk.
 * @returns {Array} - The updated TOC array, where each entry has a new `chunks` property (array of strings).
 */
function mergeTocWithPages(toc, pages, tokenizer, maxTokens = 4000) {
  // 1) Sort the flattened TOC by its page number so we can easily find the "next" start page
  const sortedToc = [...toc].sort((a, b) => a.page - b.page);

  // 2) Create a helper to retrieve page text from `pages`
  function getPageText(pageNumber) {
    const key = String(pageNumber);
    if (!pages[key]) return "";
    return pages[key].text;
  }

  // 3) Map over each TOC entry
  return sortedToc.map((entry, index) => {
    // - The start page for this entry
    const startPage = entry.page;

    // - The next entry (if any)
    const nextEntry = sortedToc[index + 1];

    // - The next start page or Infinity if we’re at the last entry
    const nextStartPage = nextEntry ? nextEntry.page : sortedToc.at(-1).page;

    // 4) Gather all pages from startPage up to nextStartPage - 1
    let combinedText = "";
    for (let p = startPage; p < nextStartPage; p++) {
      combinedText += getPageText(p) + "\n";
    }

    // 5) Chunk the combined text
    const chunks = chunkSectionByTokens(combinedText, maxTokens, tokenizer);

    // 6) Return the new entry with `chunks`
    return {
      ...entry,
      chunks,
    };
  });
}

/*************************************************
 * EXECUTION IN N8N (MAIN LOGIC)
 *************************************************/
function main() {
  // 1) Grab text from the first input item
  let { text } = $input.first().json;

  // 2) Pre-process the text
  text = text
    .replace(/\\n/g, "\n") // Turn literal "\n" into actual newlines
    .replace(/\-\n/g, "") // Remove hyphens from line-wrapped words
    .replace(/\n{2,}/g, "\n\n") // Collapse multiple blank lines to exactly two
    .replace(/(\.\s+){2,}/g, " "); // Remove repeated ". " sequences

  // 3) Parse pages
  const pageChapterOverrides = {
    xi: "The Project 2025 Advisery Board",
    xiii: "The 2025 Presidential Transition Project",
  };
  const pages = parsePages(text, pageChapterOverrides);

  // 4) Create a tokenizer (using "gpt-4o" as in your example)
  const tokenizer = encodingForModel("chatgpt-4o-latest");

  // 5) Merge the table of contents with the parsePages result
  const structuredTOC = mergeTocWithPages(
    TABLE_OF_CONTENTS,
    pages,
    tokenizer,
    4000
  );

  // 6) Return the final structured TOC from this node
  return [
    {
      json: {
        sections: structuredTOC,
      },
    },
  ];
}

return main();
