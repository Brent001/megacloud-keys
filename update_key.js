import fs from "fs";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const API_KEY = process.env.API_KEY
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);

async function generateContent(prompt) {
  try {
    const response = await axios.post(API_URL, {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    });
    return response.data.candidates[0]?.content?.parts[0]?.text.trim();
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function main() {
  try {
    console.log("Fetching script...");
    const response = await axios.get(
      "https://megacloud.blog/js/player/a/v2/pro/embed-1.min.js?v=" + Date.now()
    );
    console.log("Received script.");

    await writeFileAsync("input.txt", response.data, "utf8");

    console.log("input.txt successfully written.");

    console.log("Running deobfuscate.js...");
    await execAsync("node deobfuscate.js");

    console.log("deobfuscate.js finished.");

    console.log("Reading output.js...");

    fs.readFile("output.js", "utf8", async (err, data) => {
      if (err) {
        console.error("!Error reading file!", err);
        return;
      }

      try {
        const match = data.match(/\(\(\)\s*=>\s*\{([\s\S]*?)try\s*{/);
        if (!match) {
          console.error("!No match found!");
          return;
        }
        console.log(match[0]);

        const extra_message =
          "Decode the following obfuscated script, extract, and retain only the relevant code that directly generates the 64-bit secret key.Remove all irrelevant, unused, or undefined code — keep just the cleaned-up JavaScript that performs the key generation.The cleaned-up script should be self-contained and functional, with the last line printing the generated key (using console.log), and do not wrap it inside any function.Do not include comments, explanations, or additional fluff — output code only.";
        const prompt = match[0] + "\n" + extra_message;

        console.log("Waiting for LLLM response.");

        const decoded_code = await generateContent(prompt);

        const lines = decoded_code.split("\n");

        const final_code = lines
          .slice(1, -1)
          .join("\n")
          .replace("console.log", "return");
        let finalKey = new Function(final_code)();

        if (typeof finalKey === "string") {
          await writeFileAsync("key.txt", finalKey, "utf8");

          console.log("Key successfully written.");
        } else {
          console.error(
            "Generated code did not return a key."
          );
        }
      } catch (error) {
        console.error("Error processing output.js.", error);
      }
    });
  } catch (error) {
    console.error("Error in main.", error);
  }
}

main()
  .then()
  .catch((error) => console.error(error));
