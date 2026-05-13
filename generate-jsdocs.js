const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, 'src', 'edbo', 'entrance', 'entrance.service.ts');
const dtoDir = path.join(__dirname, 'src', 'edbo', 'entrance', 'dto');

let serviceContent = fs.readFileSync(servicePath, 'utf8');

function kebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// Function to parse a DTO file and get its fields
function getDtoFields(dtoClassName) {
    const fileName = kebabCase(dtoClassName.replace('Dto', '')) + '.dto.ts';
    const filePath = path.join(dtoDir, fileName);
    if (!fs.existsSync(filePath)) {
        // try without params/response? just in case
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    
    const fields = [];
    // Match `@ApiProperty({ description: '...' })` or `@ApiPropertyOptional(...)`
    const fieldRegex = /@ApiProperty(?:Optional)?\s*\(\s*\{[^\}]*description:\s*'([^']+)'[^\}]*\}\s*\)\s*(?:@[A-Za-z0-9_\(\)\{\}\s,]*\s*)*([a-zA-Z0-9_]+)([!|?])?:/g;
    
    let match;
    while ((match = fieldRegex.exec(content)) !== null) {
        const description = match[1];
        const fieldName = match[2];
        const isRequired = match[3] === '!';
        fields.push({ fieldName, description, isRequired });
    }
    return fields;
}

// Match methods in the service
// Existing JSDoc: (/\/\*\*[\s\S]*?\*\/\s*)?
// Method signature: (async\s+)?([a-zA-Z0-9_]+)\s*\(\s*(?:params|data)\s*:\s*([a-zA-Z0-9_]+)\s*\)\s*:\s*Promise<([a-zA-Z0-9_\[\]]+)>\s*\{
const methodRegex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?(async\s+)?([a-zA-Z0-9_]+)\s*\(\s*(?:params|data)\s*:\s*([a-zA-Z0-9_]+)\s*\)\s*:\s*Promise<([a-zA-Z0-9_\[\]]+)>\s*\{/g;

let match;
const replacements = [];

while ((match = methodRegex.exec(serviceContent)) !== null) {
    const fullMatch = match[0];
    const existingJsDoc = match[1] || '';
    const isAsync = match[2] || '';
    const methodName = match[3];
    const paramType = match[4];
    const returnType = match[5];
    
    // Parse existing JSDoc
    let descriptionLines = [];
    let endpoint = '';
    let returns = 'Результат виконання операції';
    let example = '';
    
    if (existingJsDoc) {
        const lines = existingJsDoc.split('\n').map(l => l.trim().replace(/^\*\s?/, ''));
        
        let capturingExample = false;
        let exampleLines = [];
        
        for (const line of lines) {
            if (line.startsWith('@param')) continue;
            if (line.startsWith('@returns')) {
                returns = line.replace('@returns', '').trim();
                capturingExample = false;
                continue;
            }
            if (line.startsWith('@example')) {
                capturingExample = true;
                continue;
            }
            
            if (capturingExample) {
                if (line) exampleLines.push(line);
                continue;
            }
            
            if (line.startsWith('\`POST')) {
                endpoint = line;
                continue;
            }
            
            if (line) {
                descriptionLines.push(line);
            }
        }
        if (exampleLines.length) {
            example = '\n   *\n   * @example\n' + exampleLines.map(l => `   * ${l}`).join('\n');
        }
    }
    
    // Guess endpoint if missing
    if (!endpoint) {
        endpoint = `\`POST /api/entrance/... \``; // Should manually check or regex
        const urlMatch = new RegExp(`return this\\.edbo\\.post(?:<[^>]+>)?\\(\\s*'([^']+)'`).exec(serviceContent.substring(match.index));
        if (urlMatch) {
            endpoint = `\`POST ${urlMatch[1]}\``;
        }
    }
    
    // Get fields from DTO
    const fields = getDtoFields(paramType);
    
    // Build new JSDoc
    let newJsDoc = `  /**\n`;
    if (descriptionLines.length) {
        newJsDoc += descriptionLines.map(l => `   * ${l}`).join('\n') + `\n   *\n`;
    }
    newJsDoc += `   * ${endpoint}\n   *\n`;
    newJsDoc += `   * @param data - Параметри запиту\n`;
    
    for (const f of fields) {
        const reqStr = f.isRequired ? ' (**обов\'язковий**)' : '';
        newJsDoc += `   * @param data.${f.fieldName} - ${f.description}${reqStr}\n`;
    }
    
    newJsDoc += `   * @returns ${returns}${example}\n   */\n`;
    newJsDoc += `  ${isAsync}${methodName}(data: ${paramType}): Promise<${returnType}> {`;
    
    replacements.push({
        start: match.index,
        end: match.index + fullMatch.length,
        text: newJsDoc
    });
}

// Apply replacements from bottom to top
for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    serviceContent = serviceContent.substring(0, r.start) + r.text + serviceContent.substring(r.end);
}

// Rename `params` to `data` inside the methods (specifically inside `this.edbo.post`)
// Regex: return this\.edbo\.post(?:<[^>]+>)?\([^,]+,\s*params\s*\);
serviceContent = serviceContent.replace(/return this\.edbo\.post((?:<[^>]+>)?)\(([^,]+),\s*params\s*\);/g, 'return this.edbo.post$1($2, data);');

fs.writeFileSync(servicePath, serviceContent);
console.log('Done generating JSDocs!');
