import fs from "fs";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const API_KEY_1 = process.env.API_KEY_1;
const API_KEY_2 = process.env.API_KEY_2;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=`;

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);

async function generateContent(prompt, API_KEY) {
  try {
    const response = await axios.post(API_URL + API_KEY, {
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

async function processSite(url, scriptFile, outputFile, API_KEY) {
  console.log(`Fetching script from ${url}...`);

  try {
    const response = await axios.get(url);
    console.log("Received script.");

    await writeFileAsync(scriptFile, response.data, "utf8");

    console.log("input.txt successfully written.");

    console.log("Running deobfuscate.js...");
    await execAsync("node deobfuscate.js");

    console.log("deobfuscate.js finished.");

    console.log("Reading output.js.");

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
        console.log("Match found.");
        const xor_value_regex = /\b([a-zA-Z_$][\w$]*)\s*=\s*(?!0\b)(\d+)\s*;/g;
        const xor_value = match[0].match(xor_value_regex)[0];
        const extra_message =
          `Decode the following obfuscated script, extract, and retain only the relevant code that directly generates the 64-bit secret key.Remove all irrelevant, unused, or undefined code — keep just the cleaned-up JavaScript that performs the key generation.The cleaned-up script should be self-contained and functional, with the last line printing the generated key (using console.log), and do not wrap it inside any function.Do not include comments, explanations, or additional fluff — output code only. ${xor_value?`Also we have ${xor_value},so when you do mapping, xor each element with the ${xor_value}`:""}`;
        const prompt = match[0] + "\n" + extra_message;

        console.log("Waiting for LLLM response.");

        const decoded_code = await generateContent(prompt, API_KEY);
        console.log(decoded_code);

        const lines = decoded_code.split("\n");

        const startsWithFence = lines[0]?.trim().startsWith("```javascript");
        const endsWithFence = lines[lines.length - 1]?.trim() === "```";

        const final_code = (
          startsWithFence && endsWithFence ? lines.slice(1, -1) : lines
        )
          .join("\n")
          .replace("console.log", "return");

        let finalKey = new Function(final_code)();

        console.log("\nFinal key is: ");
        console.log(finalKey + "\n");

        if (typeof finalKey === "string") {
          await writeFileAsync(outputFile, finalKey.trim(), "utf8");

          console.log("Key successfully written.");
        } else {
          console.error("Generated code did not return a key.");
        }
      } catch (error) {
        console.error("Error processing output.js.", error);
      }
    });
  } catch (error) {
    console.error("Error in main.", error);
  }
}

async function main() {
  await processSite(
    "https://megacloud.blog/js/player/a/v2/pro/embed-1.min.js?v=" + Date.now(),
    "input.txt",
    "key.txt",
    API_KEY_1
  );

  // await processSite(
  //   "https://cloudvidz.net/js/player/m/v2/pro/embed-1.min.js?v=" + Date.now(),
  //   "input.txt",
  //   "rabbit.txt",
  //   API_KEY_2
  // );
}

main()
  .then()
  .catch((error) => console.error(error));
