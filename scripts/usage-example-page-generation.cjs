// 

const fs = require("fs");
const kleur = require("kleur");
const path = require('path');


// Define language label mappings
const languageLabelMappings = {
  cpp: "C++",
  csharp: "C#",
  // python: "Python",
  // pascal: "Pascal",
  // Add more mappings as needed
};

// Define language file extensions
const languageFileExtensions = {
  cpp: ".cpp",
  csharp: ".cs",
  python: ".py",
  pascal: ".pas"
};

const languageOrder = ["cpp", "csharp", "python"];//, "pascal"];

var name;

function getJsonData() {
  var data = fs.readFileSync(`${__dirname}/api.json`);
  return JSON.parse(data);
}

function getApiCategories(jsonData) {
  const apiCategories = [];
  for (const categoryKey in jsonData) {
    if (categoryKey != "types") {
      apiCategories.push(categoryKey);
    }
  }
  return apiCategories;
}

function getUniqueFunctionNames(categoryKey, jsonData) {
  const category = jsonData[categoryKey];
  const functionNames = category.functions.map((func) => func.unique_global_name);
  return functionNames;
}

function getFunctionGroups(categoryKey, jsonData) {
  const category = jsonData[categoryKey];
  const functionNames = category.functions.map((func) => func.name);
  return functionNames;
}

function getAllFiles(dir, allFilesList = []) {
  const files = fs.readdirSync(dir);
  files.map(file => {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) { // check if subdirectory is present
      getAllFiles(name, allFilesList);     // do recursive execution for subdirectory
    } else {
      allFilesList.push(file);           // push filename into the array
    }
  })
  return allFilesList;
}

function getFunctionLink(jsonData, groupNameToCheck, uniqueNameToCheck) {
  var isOverloaded;
  var functionIndex = -1;
  var functionLink = "";
  for (const categoryKey in jsonData) {
    const category = jsonData[categoryKey];
    const categoryFunctions = category.functions;
    const functionGroups = {}; // Store functions grouped by name
    categoryFunctions.forEach((func) => {
      const functionName = func.name;
      if (!functionGroups[functionName]) {
        functionGroups[functionName] = [];
      }
      functionGroups[functionName].push(func);
    });

    for (const functionName in functionGroups) {
      if (functionName == groupNameToCheck) {
        const overloads = functionGroups[functionName];
        isOverloaded = overloads.length > 1;

        if (isOverloaded) {
          overloads.forEach((func, index) => {
            functionIndex = index + 1;
            if (uniqueNameToCheck == func.unique_global_name) {
              functionLink = functionName + "-" + (index + 1);
            }
          });
        }
        else {
          functionLink = functionName;
        }
      }
    }
  }
  return functionLink;
}

// ===============================================================================
// Start of Main Script
// ===============================================================================

console.log(kleur.white("Generating MDX files for Usage Examples pages..."));
console.log(kleur.white("---------------------------------------"));

let checkFunction = "";

if (process.argv[2] != null)
{
  checkFunction = process.argv[2];
  console.log(kleur.magenta("Checking function: ") + kleur.cyan(process.argv[2]));
}

let apiJsonData = getJsonData();
let categories = getApiCategories(apiJsonData);

categories.forEach((categoryKey) => {
  let categoryPath = './public/usage-examples-files/' + categoryKey;
  const categoryFiles = getAllFiles(categoryPath);
  const txtFiles = categoryFiles.filter(file => file.endsWith('.txt'))

  // Start of each page creation
  if (txtFiles.length > 0) {
    let mdxContent = "";

    // Create header info on page
    let categoryTitle = categoryKey.split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    let categoryURL = categoryKey.replaceAll("_", "-");
    name = categoryTitle;
    mdxContent += "---\n";
    mdxContent += `title: ${categoryTitle}\n`;
    mdxContent += "banner:\n";
    mdxContent += `  content: Check out how to use the ${categoryTitle} functions!\n`;
    mdxContent += "---\n\n";
    mdxContent += ":::note\n";
    mdxContent += `This page contains code examples of the [${categoryTitle}](/api/${categoryURL}) functions.\n`
    mdxContent += ":::\n\n";

    mdxContent += `import { Tabs, TabItem } from "@astrojs/starlight/components";\n`
    mdxContent += `import { Code } from '@astrojs/starlight/components';\n`;
    mdxContent += `import Signatures from "/src/components/Signatures.astro";\n`;

    // get function overload info
    let functionGroups = getFunctionGroups(categoryKey, apiJsonData);

    // get function info
    let functions = getUniqueFunctionNames(categoryKey, apiJsonData);
    let functionIndex = 0;
    var groupName = "";
    functions.forEach((functionKey) => {
      const functionExampleFiles = txtFiles.filter(file => file.startsWith(functionKey + '-'));
      groupName = functionGroups[functionIndex];

      if (functionExampleFiles.length > 0) {

        // Create function heading
        let functionTitle = groupName.split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // Create Function Example heading with link
        const functionURL = getFunctionLink(apiJsonData, groupName, functionKey);
        mdxContent += `\n## [${functionTitle}](/api/${categoryURL}/#${functionURL.replaceAll("_", "-")}) Examples*\n\n`;

        // Function signature heading (possible need to update)
        const signature = apiJsonData[categoryKey].functions.map((func) => func.signature)[functionIndex].replaceAll(";", "");
        mdxContent += `:::tip[*]\n`;
        mdxContent += `The example(s) below are using the **${functionTitle}** function with the following signatures:\n\n`
        mdxContent += `<Signatures name="${functionKey.replaceAll("_", "-")}">\n`;
        mdxContent += `</Signatures>\n`;
        mdxContent += "\n:::\n";

        functionExampleFiles.forEach((exampleTxtKey) => {
          let exampleKey = exampleTxtKey.replaceAll(".txt", "");

          // Description
          let txtFilePath = categoryPath + "/" + functionKey + "/" + exampleTxtKey;
          let exampleTxt = fs.readFileSync(txtFilePath);
          mdxContent += "\n";
          mdxContent += exampleTxt.toString();
          mdxContent += "\n\n";

          var languageCodeAvailable = {
            cpp: false,
            csharp: false,
            python: false,
            // pascal: false
          };

          // import code
          let codePath = categoryPath + "/" + functionKey;
          const codeFiles = getAllFiles(codePath);
          let importTitle = exampleKey.replaceAll("-", "_");

          languageOrder.forEach((lang) => {
            const languageFiles = codeFiles.filter(file => file.endsWith(languageFileExtensions[lang]));
            let codeFilePath = categoryPath + "/" + functionKey + "/" + exampleTxtKey.replaceAll(".txt", languageFileExtensions[lang]);

            // import code if available
            if (languageFiles.length > 0) {
              languageCodeAvailable[lang] = true;

              // Check if both top level and oop code has been found for current function
              const csharpFiles = codeFiles.filter(file => file.endsWith("-top-level.cs") || file.endsWith("-oop.cs")).filter(file => file.includes(exampleKey));
              if (lang == "csharp" && csharpFiles.length > 0) {
                csharpFiles.forEach(file => {
                  if (file.includes(exampleKey)) {
                    if (file.includes("-top-level")) {
                      mdxContent += `import ${importTitle}_top_level_${lang} from '${codeFilePath.replaceAll(".cs", "-top-level.cs")}?raw';\n`;
                    }
                    if (file.includes("-oop")) {
                      mdxContent += `import ${importTitle}_oop_${lang} from '${codeFilePath.replaceAll(".cs", "-oop.cs")}?raw';\n`;
                    }
                  }
                });
              }
              else {
                // console.log(codeFilePath);
                
                mdxContent += `import ${importTitle}_${lang} from '${codeFilePath}?raw';\n`;
              }
            }
          });

          mdxContent += "\n";

          // Code tabs
          mdxContent += "<Tabs syncKey=\"code-language\">\n";
          languageOrder.forEach((lang) => {
            // add code tab if available
            if (languageCodeAvailable[lang]) {
              const languageLabel = languageLabelMappings[lang] || lang;
              mdxContent += `  <TabItem label="${languageLabel}">\n`;

              // Check if both top level and oop code has been found for current function
              const csharpFiles = codeFiles.filter(file => file.endsWith("-top-level.cs") || file.endsWith("-oop.cs")).filter(file => file.includes(exampleKey));
              if (lang == "csharp" && csharpFiles.length > 0) {
                mdxContent += "\n  <Tabs syncKey=\"csharp-style\">\n";
                // use reverse order to make Top level first
                csharpFiles.slice().reverse().forEach(file => {
                  if (file.includes(exampleKey)) {
                    // console.log(file);
                    if (file.includes("-top-level")) {
                      mdxContent += `    <TabItem label="Top-level Statements">\n`;
                      mdxContent += `      <Code code={${importTitle}_top_level_${lang}} lang="${lang}" />\n`;
                      mdxContent += "    </TabItem>\n";
                    }
                    if (file.includes("-oop")) {
                      mdxContent += `    <TabItem label="Object-Oriented">\n`;
                      mdxContent += `      <Code code={${importTitle}_oop_${lang}} lang="${lang}" />\n`;
                      mdxContent += "    </TabItem>\n";
                    }
                  }
                });
                mdxContent += "  </Tabs>\n\n";
                mdxContent += "  </TabItem>\n";
              }
              else {
                // console.log(importTitle);
                mdxContent += `    <Code code={${importTitle}_${lang}} lang="${lang}" />\n`;
                mdxContent += "  </TabItem>\n";
              }
            }

          });
          mdxContent += "</Tabs>\n\n";

          // Image or gif output
          mdxContent += "**Output**:\n\n";

          // const outputFiles = getAllFiles('./public/usage-examples-images-gifs/' + categoryKey);
          const imageFiles = categoryFiles.filter(file => file.endsWith(exampleKey + '.png'));
          let outputFilePath;
          if (imageFiles.length > 0) {
            outputFilePath = categoryPath + "/" + exampleTxtKey.replaceAll(".txt", ".png");
          }
          else {
            const gifFiles = categoryFiles.filter(file => file.endsWith('.gif'));
            if (gifFiles.length > 0) {
              outputFilePath = categoryPath + "/" + exampleTxtKey.replaceAll(".txt", ".gif");
            }
            else {
              console.log(kleur.red("Error: No image or gif files found for " + exampleKey + "usage example"));
            }
          }

          mdxContent += `![${exampleKey} example](${outputFilePath})\n`
          mdxContent += "\n---\n";
        });
      }
      functionIndex++;
    });

    // Write the MDX file
    fs.writeFile(`./src/content/docs/usage-examples/${name}.mdx`, mdxContent, (err) => {
      if (err) {
        console.log(kleur.red(`Error writing ${categoryKey} MDX file: ${err.message}`));
      } else {
        console.log(kleur.yellow('Usage Examples') + kleur.green(` -> ${categoryKey}`));

      }
    });
  }
});
console.log(kleur.green("All usage-example MDX files generated successfully.\n"));