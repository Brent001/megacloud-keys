import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

// const pattern = new RegExp(
//   'var\\s+([\\w$ ,\\n\\t\\r]+);\\s+([\\w$]+)\\s*=\\s*\\[\\s*((?:(?:"[^"]*"|[^\\]"\\n\\r])+?))\\s*\\]\\s*;\\s+([\\w$]+)\\s*=\\s*\\[\\s*((?:(?:"[^"]*"|[^\\]"\\n\\r])+?))\\s*\\]\\s*;',
//   "g"
// );
const pattern = new RegExp(
  'var\\s+([\\w$ ,\\n\\t\\r]+);\\s+D\\s*=\\s*"--([a-fA-F0-9]+)"\\s*;',
  "g"
);

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function main() {
  try {
    // 1. Perform axios first
    console.log("Fetching data from API.");
    console.log(Date.now());

    const response = await axios.get(
      "https://megacloud.blog/js/player/a/v2/pro/embed-1.min.js?v=" + Date.now()
    );

    console.log("Received data from API.");

    // Dump into input.txt
    await writeFileAsync("input.txt", response.data, "utf8");

    console.log("input.txt successfully written.");

    // 2. Now execute deobfuscate.js
    console.log("Running deobfuscate.js.");

    await execAsync("node deobfuscate.js");

    console.log("deobfuscate.js finished.");

    // 4. Now proceed with your script
    console.log("Reading output.js.");

    const data = await readFileAsync("output.js", "utf8");

    let match;
    match = pattern.exec(data);
    // while ((match = pattern.exec(data)) !== null) {
    //   const varNames = match[1]
    //     .trim()
    //     .split(",")
    //     .map((v) => v.trim());

    //   const firstArrayName = match[2].trim();
    //   const firstArrayValues = match[3].trim();

    //   const SecondArrayName = match[4].trim();
    //   const SecondArrayValues = match[5].trim();

    //   // Now we can construct:
    //   const newCode = `
    //     var ${varNames.join(", ")};

    //     ${firstArrayName} = [${firstArrayValues}];
    //     ${SecondArrayName} = [${SecondArrayValues}];
    //     let finalKey = ${SecondArrayName}.map(index => ${firstArrayName}[index]).join('');
    //     return finalKey;
    //   `;
    //   try {
    //     const finalKey = new Function(newCode)();

    //     if (typeof finalKey === "string") {
    //       await writeFileAsync("key.txt", finalKey, "utf8");

    //       console.log("Key successfully written.");
    //     } else {
    //       console.error("Generated code did not return a string.");
    //     }
    //   } catch (error) {
    //     console.error("Error executing generated code.", error);
    //   }
    // }
    try {
      const finalKey = match[2];

      if (typeof finalKey === "string") {
        await writeFileAsync("key.txt", finalKey, "utf8");

        console.log("Key successfully written.");
      } else {
        console.error("Generated code did not return a string.");
      }
    } catch (error) {
      console.error("Error executing generated code.", error);
    }
    console.log("Done.");
  } catch (error) {
    console.error(error);
  }
}

main();
