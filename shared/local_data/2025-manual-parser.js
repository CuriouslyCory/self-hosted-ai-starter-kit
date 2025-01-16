function isAllCaps(str) {
    // This regex tests whether str is composed entirely of uppercase letters (A–Z) and has at least one character
    return /^[A-Z\ ]+$/.test(str);
  }
  
  function shiftUntilSingleLetter(lines) {
    let shifted = [];
    while(lines.length > 0){
      // if the line is a single capital letter we 
      // have the whole thing
      const trimmedLine = lines[0].trim();
      if(trimmedLine.length === 1 && isAllCaps(trimmedLine)){
        break;
      }
      if(isAllCaps(trimmedLine)){
        shifted.push(lines.shift().trim());
      }else{
        break;
      }
    }
    return shifted.join(" ");
  }
  
  /**
   * parsePages
   *
   * Splits the input text by page markers (e.g., "— xii —", "— 14 —"),
   * extracts a default chapter name from the first line of text on each page
   * (unless an override is provided), and returns an object keyed by page labels.
   *
   * - Page labels can be Roman numerals or digits (captured by the regex).
   * - If the page label is numeric and even, and the guessed chapter name matches
   *   "Mandate for Leadership: The Conservative Promise", it reuses the previous
   *   numeric page's chapter name.
   * - Override entries in `overrides` allow specifying a custom chapter name for a given page label.
   *
   * @param {string} input - The full text to parse
   * @param {Object.<string, string>} [overrides={}] - Map of page labels to forced chapter names
   * @returns {Object.<string, { page: string, chapter: string, text: string }>}
   *   An object keyed by page label, each containing { page, chapter, text }.
   */
  function parsePages(input, overrides = {}) {
    // Regex that captures markers like: "— xii —", "— 13 —" etc.
    // and then any text until the next marker or end of string.
    const PAGE_MARKER_REGEX = /(—\s[ivxlcdmIVXLCDM0-9]*\s—)\s*([^]*?)(?=(—\s[ivxlcdmIVXLCDM0-9]*\s—|$))/g;
  
    const results = {};
    let match;
  
    // Keep track of the last numeric page label we parsed
    let lastNumericPageLabel = null;
    let section = "";
    
    while ((match = PAGE_MARKER_REGEX.exec(input)) !== null) {
      // Example: match[1] -> "— xii —" or "— 14 —"
      // Remove the first/last '—' and trim spaces to get "xii" or "14"
      let pageLabel = match[1].trim().slice(1, -1).trim();
      if(["43","69"].includes(pageLabel)){
        console.log(match);
      }
  
      // The remainder of text for that page
      const pageContent = match[2].trim();
  
      // Split lines to guess the chapter from the first line (unless override).
      let lines = pageContent.split(/\r?\n/);
      let guessedChapterName = "";
  
      // Check the first line to see if it is a section or foreward heading
      if(
        lines[0].startsWith("Section") && 
        isNaN(parseInt(lines[0][8], 10))
      ){
        // New Section Start
        // get the section title
        section = (lines.shift() || "").trim();
        // chapter should be all capital letters until a line with a single letter
        guessedChapterName = shiftUntilSingleLetter(lines);
        // merge the line with the single letter with the next one
        lines = [lines[0] + lines[1], ...lines.slice(2)];
      }else if(lines.at(-1).trim() === "Foreword"){
        // Foreward Page
        // pages like this have the title at the end
        section = (lines.pop() || "").trim();
        guessedChapterName = shiftUntilSingleLetter(lines);
      }else if(!isNaN(parseInt(lines[0], 10))){
        // Page between sub-sections
        // shift off the digit, it's pointless
        lines.shift()
        guessedChapterName = shiftUntilSingleLetter(lines);
      }
      if(guessedChapterName !== ""){
        lastNumericPageLabel = pageLabel;
      }
  
      if(["1", "2"].includes(pageLabel)){
        console.log(`pageLabel: ${pageLabel}, lastNumericPageLabel: ${lastNumericPageLabel}, guessedChapterName: ${guessedChapterName}`); 
      }
  
      // If there's no override, pop the first line as the guessed chapter name
      if (!overrides[pageLabel] && guessedChapterName === "") {
        guessedChapterName = (lines.shift() || "").trim();
      }
  
      // Final chapter name is either the override or the guessed name
      let chapterName = overrides[pageLabel] || guessedChapterName;
  
      // Check if pageLabel is numeric
      const pageNum = parseInt(pageLabel, 10);
      if (!isNaN(pageNum)) {
        // If even page & guessed chapter is the doc title, inherit from last numeric page
        if (
          pageNum % 2 === 0 &&
          chapterName === "Mandate for Leadership: The Conservative Promise" &&
          lastNumericPageLabel !== null &&
          results[lastNumericPageLabel]
        ) {
          chapterName = results[lastNumericPageLabel].subsection;
        }
        // Update the last numeric page label
        lastNumericPageLabel = pageLabel;
      }
  
      // The rest of the text after removing the first line
      const text = lines.join("\n").trim();
  
      // Build the result object
      results[pageLabel] = {
        page: pageLabel,
        section: section.toString(),
        subsection: chapterName,
        text,
      };
    }
  
    return results;
  }
  
  const pageChapterOverrides = {
    "xi": "The Project 2025 Advisery Board",
    "xiii": "The 2025 Presidential Transition Project",
    // "1": "Foreward",
    // "21": "Section One",
    // "23": "WHITE HOUSE OFFICE",
    // "43": "Executive Office of the President of the United States",
    // "44": "Executive Office of the President of the United States"
  }
  
  let text = $input.first().json.text;
  
  text = text.replace(/\\n/g, "\n") // replace \n string with newline
     .replace(/\-\n/g, "") // remove hyphons from word-wraps
     .replace(/\n{2,}/g, '\n\n') // Preserve paragraphs by collapsing multiple blank lines to exactly two
     .replace(/(\.\s+){2,}/g, ' '); // remove dot strings used for padding
  
  console.log(text);
  var pages = parsePages(text, pageChapterOverrides);
  //console.log(pages);
  
  return Array.from(Object.values(pages));