//This will basically convert the audio files and video into text so that it can be embedded
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const fs = require("fs");

async function transcribeIfNeeded({ file, text }) {
  if (text && text.trim().length > 0) return text;
  if (file) {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(file.path),
      model: "whisper-1",
    });
    return transcription.text;
  }
  return '';
}
