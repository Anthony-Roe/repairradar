import { JSDoc, JSDocableNode, Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import { concat } from "lodash";

const project = new Project();
project.addSourceFilesAtPaths("E:\\Dev\\websites\\repairradar-v0.1\\src/**/*.ts");

const result: any[] = [];

for (const sourceFile of project.getSourceFiles()) {
    if (sourceFile.getFilePath().includes("/prisma/")) continue;

    const fileData = {
        filePath: sourceFile.getFilePath(),
        exports: [] as any[],
    };

    const exports = sourceFile.getExportedDeclarations();
    for (const [name, declarations] of exports) {
        for (const declaration of declarations) {
            const kind = declaration.getKindName();
            const docs = declaration.getLeadingCommentRanges().map(comment => comment.getText());
            const fullText = declaration.getText().slice(0, 1000); // Limit body size for context

            const signature = (declaration as any).getSignature?.()?.getDeclaration()?.getText?.() || "";

            const calledFunctions: Set<string> = new Set();
            const usedVariables: Set<string> = new Set();

            declaration.forEachDescendant((node) => {
                if (node.getKind() === SyntaxKind.CallExpression) {
                    const expr = node.asKind(SyntaxKind.CallExpression);
                    const identifier = expr?.getExpression().getText();
                    if (identifier) calledFunctions.add(identifier);
                }

                if (node.getKind() === SyntaxKind.Identifier) {
                    const ident = node.getText();
                    usedVariables.add(ident);
                }
            });

            fileData.exports.push({
                name,
                kind,
                documentation: docs || [],
                calledFunctions: Array.from(calledFunctions),
                referencedVariables: Array.from(usedVariables),
                signature: signature || null,
                snippet: fullText,
            });
        }
    }

    if (fileData.exports.length > 0) {
        result.push(fileData);
    }
}

fs.writeFileSync("ts-exports-ai.json", JSON.stringify(result, null, 2), "utf8");
console.log("AI-ready export saved to ts-exports-ai.json");
