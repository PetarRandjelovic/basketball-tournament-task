const fs = require('fs');

function saveFile(results, name) {
    if (!fs.existsSync('jsonFiles')) {
        fs.mkdirSync('jsonFiles');
    }
    const filePath = name;
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Results have been saved to ${filePath}`);
}

module.exports = saveFile;