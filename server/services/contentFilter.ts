import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

// Common filler words and phrases to filter out
const FILLER_WORDS = {
  hinglish: [
    "umm", "uhh", "acha", "haan", "toh", "matlab", "yaar", "guys", "ok guys", "alright guys",
    "so basically", "you know", "like", "actually", "literally", "obviously", "basically",
    "देखिए", "तो", "हाँ", "ठीक है", "अच्छा", "चलिए", "समझे", "बात यह है"
  ],
  english: [
    "umm", "uhh", "like", "you know", "actually", "literally", "basically", "obviously",
    "ok guys", "alright", "so", "well", "anyway", "I mean", "kind of", "sort of"
  ],
  hindi: [
    "देखिए", "तो", "हाँ", "ठीक है", "अच्छा", "चलिए", "समझे", "बात यह है", "मतलब",
    "यार", "अरे", "हम्म", "उम्म"
  ]
};

export async function filterContent(text: string, language: string = "hinglish"): Promise<string> {
  try {
    // First, remove common filler words
    let filteredText = removeFillersBasic(text, language);

    // Then use AI for advanced filtering
    filteredText = await filterWithAI(filteredText, language);

    return filteredText;
  } catch (error) {
    console.error("Error filtering content:", error);
    // Return basic filtered text if AI filtering fails
    return removeFillersBasic(text, language);
  }
}

function removeFillersBasic(text: string, language: string): string {
  const fillers = FILLER_WORDS[language as keyof typeof FILLER_WORDS] || FILLER_WORDS.hinglish;
  
  let filtered = text;
  
  // Remove filler words (case insensitive)
  fillers.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    filtered = filtered.replace(regex, '');
  });

  // Clean up extra spaces and punctuation
  filtered = filtered
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\.\s*\./g, '.') // Multiple periods
    .replace(/,\s*,/g, ',') // Multiple commas
    .trim();

  return filtered;
}

async function filterWithAI(text: string, language: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert content filter for educational material. Your task is to clean transcribed educational content by:

          1. Removing filler words, hesitations, and speech disfluencies
          2. Filtering out side jokes, personal anecdotes, and off-topic conversations
          3. Removing informal greetings and social chat that don't contribute to learning
          4. Keeping only the core educational content and explanations
          5. Maintaining the natural flow and coherence of the educational explanation
          6. Preserving technical terms, examples, and important context
          7. Keeping the language style (${language}) natural and educational

          IMPORTANT: 
          - Do NOT change the meaning or add new information
          - Do NOT make the content too formal if it was naturally conversational
          - DO preserve questions and answers that are educational
          - DO keep examples and analogies that help explain concepts
          
          Return only the filtered educational content, maintaining readability and flow.`
        },
        {
          role: "user",
          content: `Please filter this educational content, keeping only the valuable learning material:\n\n${text}`
        }
      ],
      temperature: 0.1,
      response_format: { type: "text" },
    });

    const filtered = response.choices[0].message.content || text;
    
    // Additional safety check - ensure we didn't lose too much content
    if (filtered.length < text.length * 0.3) {
      console.warn("AI filtering removed too much content, falling back to basic filtering");
      return removeFillersBasic(text, language);
    }

    return filtered;
  } catch (error) {
    console.error("Error in AI content filtering:", error);
    throw error;
  }
}

export async function identifyTopics(text: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert at identifying educational topics from text content. 
          Analyze the given text and identify the main topics or concepts being discussed.
          Return a JSON array of topic strings, each being a concise topic name (2-5 words).
          Focus on educational concepts, theories, formulas, or principles being taught.`
        },
        {
          role: "user",
          content: `Identify the main educational topics in this content:\n\n${text}`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.topics || [];
  } catch (error) {
    console.error("Error identifying topics:", error);
    return ["General Topic"];
  }
}
