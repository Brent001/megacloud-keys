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

         const extraMessage = `
                    Decode the following obfuscated script, extract, and retain only the relevant code that directly generates the 64-bit secret key.
                    Remove all irrelevant, unused, or undefined code — keep just the cleaned-up JavaScript that performs the key generation.
                    The cleaned-up script should be self-contained and functional, with the last line printing the generated key (using console.log), and do not wrap it inside any function. 
                    but if in case the the code look similar to this
                    if (H[318560].m8rnkMB()) {
                    U = [29, 31, 16, 26, 31, 25, 24, 29, 27, 31, 17, 17, 79, 17, 72, 26, 77, 76, 31, 31, 29, 30, 75, 75, 25, 77, 74, 17, 16, 31, 17, 75, 28, 30, 29, 30, 31, 29, 16, 29, 77, 75, 30, 77, 75, 28, 29, 16, 27, 76, 25, 31, 76, 79, 29, 27, 72, 28, 74, 24, 76, 74, 27, 27];
                    V = () => {
                    H.h$E.t9f0vXT();
                    if (!H.h9.J870crs()) {
                    return v0g13["fromCharCode"] (...U["map"](a => {
                    if (!H.P6R.y7PE9tf()) {}
                    H.h$E.t9f0vxT();
                    if (H[318560].m8rnkMB()) {
                    return 0;
                    };
                    }
                    }
                    }));
                    there will be a variable before the array you have to consider that variable as key and inside mapping you have xor it with the element and then you will get the key , but if the code is not like this then do what you understand
                    Do not include comments, explanations, or additional fluff — output code only.
        `;
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

  await processSite(
    "https://cloudvidz.net/js/player/m/v2/pro/embed-1.min.js?v=" + Date.now(),
    "input.txt",
    "rabbit.txt",
    API_KEY_2
  );
}

main()
  .then()
  .catch((error) => console.error(error));
