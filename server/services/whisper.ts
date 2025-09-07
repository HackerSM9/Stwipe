import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function transcribeAudio(audioBuffer: Buffer, language: string = "hinglish"): Promise<{
  text: string;
  duration: number;
}> {
  try {
    // Create a temporary file from buffer for OpenAI API
    const audioFile = new File([audioBuffer], "audio.mp3", { type: "audio/mpeg" });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: language === "hindi" ? "hi" : language === "english" ? "en" : undefined, // Let Whisper auto-detect for Hinglish
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    return {
      text: transcription.text,
      duration: transcription.duration || 0,
    };
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function enhanceTranscription(text: string, language: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert at cleaning and enhancing transcribed text from educational videos. Your task is to:
          1. Fix grammar and punctuation errors
          2. Correct any obvious transcription mistakes
          3. Maintain the original meaning and educational content
          4. Keep the language style (${language}) as it was spoken
          5. Do not add new information or change the educational content
          6. Format the text in clear, readable paragraphs
          
          Return only the cleaned text, nothing else.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1,
    });

    return response.choices[0].message.content || text;
  } catch (error) {
    console.error("Error enhancing transcription:", error);
    // Return original text if enhancement fails
    return text;
  }
}
