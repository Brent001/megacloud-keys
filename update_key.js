import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const pattern = new RegExp(
  'var\\s+([\\w$ ,\\n\\t\\r]+);\\s+([\\w$]+)\\s*=\\s*\\[\\s*((?:(?:"[^"]*"|[^\\]"\\n\\r])+?))\\s*\\]\\s*;\\s+([\\w$]+)\\s*=\\s*\\[\\s*((?:(?:"[^"]*"|[^\\]"\\n\\r])+?))\\s*\\]\\s*;',
  "g"
);

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function main() {
  try {
    console.log("Fetching data from API.");

    const response = await axios.get(
      "https://megacloud.blog/js/player/a/v2/pro/embed-1.min.js?v=" + Date.now()
    );

    console.log("Received data from API.");

    await writeFileAsync("input.txt", response.data, "utf8");

    console.log("input.txt successfully written.");

    console.log("Running deobfuscate.js.");

    await execAsync("node deobfuscate.js");

    console.log("deobfuscate.js finished.");

    console.log("Reading output.js.");

    const data = await readFileAsync("output.js", "utf8");

    let match;

    while ((match = pattern.exec(data)) !== null) {
      const varNames = match[1]
        .trim()
        .split(",")
        .map((v) => v.trim());
      const firstArrayName = match[2].trim();
      const firstArrayValues = match[3].trim();

      const SecondArrayName = match[4].trim();
      const SecondArrayValues = match[5].trim();

      const newCode = `
        var ${varNames.join(", ")};

        ${firstArrayName} = [${firstArrayValues}];
        ${SecondArrayName} = [${SecondArrayValues}];
        let finalKey = ${SecondArrayName}.map(index => ${firstArrayName}[index]).join('');
        return finalKey;
      `;
      try {
        const finalKey = new Function(newCode)();

        if (typeof finalKey === "string") {
          await writeFileAsync("key.txt", finalKey, "utf8");

          console.log("Key successfully written.");
        } else {
          console.error("Generated code did not return a string.");
        }
      } catch (error) {
        console.error("Error executing generated code.", error);
      }
    }

    console.log("Done.");
  } catch (error) {
    console.error(error);
  }
}

main();
