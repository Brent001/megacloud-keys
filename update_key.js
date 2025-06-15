import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const pattern1 = new RegExp(
  'var\\s+([\\w$ ,\\n\\t\\r]+);\\s+D\\s*=\\s*"--([a-fA-F0-9]+)"\\s*;',
  "g"
);

const pattern2 = new RegExp(
  'var\\s+([\\w$ ,\\n\\t\\r]+);\\s+([\\w$]+)\\s*=\\s*\\[\\s*((?:(?:"[^"]*"|[^\\]"\\n\\r])+?))\\s*\\]\\s*;\\s+([\\w$]+)\\s*=\\s*\\[\\s*((?:(?:"[^"]*"|[^\\]"\\n\\r])+?))\\s*\\]\\s*;',
  "g"
);

const pattern3 = new RegExp(

  'var\\s+([\\w$ ,\\n\\t\\r]+);\\s*([\\w$]+)\\s*=\\s*\\[((?:\\s*"[0-9a-fA-F]{2}"\\s*,?)+)\\s*\\];',
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

    if ((match = pattern1.exec(data))) {
      console.log("Matched first pattern.");
      try {
        const finalKey = match[2];
        await writeFileAsync("key.txt", finalKey, "utf8");
        console.log("Key successfully written.");
      } catch (error) {
        console.error("Error executing first match.", error);
      }
    } else if ((match = pattern2.exec(data))) {
      console.log(
        "First pattern didn't match. Matched second (fallback) pattern."
      );
      try {
        const varNames = match[1].trim();
        const firstArrayName = match[2].trim();
        const firstArrayValues = match[3].trim();
        const secondArrayName = match[4].trim();
        const secondArrayValues = match[5].trim();

        const newCode = `
          var ${varNames};
          ${firstArrayName} = [${firstArrayValues}];
          ${secondArrayName} = [${secondArrayValues}];
          let finalKey = ${secondArrayName}.map(index => ${firstArrayName}[index]).join('');
          return finalKey;
        `;

        const getDecodedKey = new Function(newCode);
        const finalKey = getDecodedKey();

        if (typeof finalKey === "string") {
          await writeFileAsync("key.txt", finalKey, "utf8");
          console.log("Key successfully written.");
        } else {
          console.error(
            "Generated code for pattern 2 did not return a string."
          );
        }
      } catch (error) {
        console.error("Error executing fallback match.", error);
      }
    } else if ((match = pattern3.exec(data))) {

      console.log("Matched third pattern.");
      try {
        const varDeclarations = match[1]; 
        const arrayName = match[2]; 
        const arrayContents = match[3]; 

        const functionBody = `
            var ${varDeclarations};
            var ${arrayName} = [${arrayContents}];

            const key = ${arrayName}
              .map((item) => String.fromCharCode(parseInt(item, 16)))
              .join("");

            return key;
        `;

        const getDecodedKey = new Function(functionBody);
        const finalKey = getDecodedKey();

        if (typeof finalKey === "string") {
          await writeFileAsync("key.txt", finalKey, "utf8");
          console.log("Key successfully written.");
        } else {
          console.error(
            "Generated code for pattern 3 did not return a string."
          );
        }
      } catch (error) {
        console.error("Error executing third match.", error);
      }
    } else {
      console.error("No matching patterns.");
    }

    console.log("Done.");
  } catch (error) {
    console.error("Error in main.", error);
  }
}

main().then().catch((error) => console.error(error));