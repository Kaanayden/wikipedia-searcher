const fs = require('fs');
const sax = require('sax');

const parser = sax.createStream(true);


const requestedWords = [''];  // Replace with your actual requested words
const nonRequestedWords = [''];  // Replace with your non-requested words

let currentTitle = '';
let currentText = '';
let inTitle = false;
let inText = false;
let capturePage = false;

function generateUrl(title) {
    title = title.replace(/[ \t]/g, "_");
    return `https://tr.wikipedia.org/wiki/${title}`;
}

// Stream to write the names of relevant articles
const output = fs.createWriteStream('filtered_titles.txt');
const personOutput = fs.createWriteStream('filtered_persons.txt');

parser.on('opentag', node => {
    if (node.name === 'title') {
        inTitle = true;
        currentTitle = '';
    } else if (node.name === 'text') {
        inText = true;
        currentText = '';
    }
});

parser.on('closetag', tagName => {
    if (tagName === 'page') {

        // Check if text includes any non-requested words
        const hasNonRequested = nonRequestedWords.some(word => currentText.includes(word));
        // Check if text includes all requested words
        const hasRequested = requestedWords.every(word => currentText.includes(word));
        // Update capture flag based on presence of requested and absence of non-requested words
        if (hasRequested && !hasNonRequested) {
            capturePage = true;
        }

        if (capturePage) {
            if(checkIfPersonPage(currentText)) {
                const outputText = `${currentTitle} - ${generateUrl(currentTitle)}`;
                console.log("PERSON - " + outputText);
                personOutput.write(outputText + '\n');
            } else {
                const outputText = `${currentTitle} - ${generateUrl(currentTitle)}`;
                console.log(outputText);
                output.write(outputText + '\n');
            }

        }
        capturePage = false;
    }
    if (tagName === 'title') {
        inTitle = false;
    }
    if (tagName === 'text') {
        inText = false;
    }
});

parser.on('text', text => {
    if (inTitle) {
        currentTitle += text;
    } else if (inText) {
        currentText += text;
    }
});

parser.on('error', error => {
    console.error(`Error parsing XML: ${error}`);
    parser.resume();
});

fs.createReadStream('trwiki-latest-pages-articles.xml').pipe(parser);

output.on('finish', () => {
    console.log('Finished writing filtered titles to file.');
});

output.on('error', error => {
    console.error('Error writing to file: ', error);
});

personOutput.on('finish', () => {
    console.log('Finished writing filtered titles to file.');
});

personOutput.on('error', error => {
    console.error('Error writing to file: ', error);
});


function checkIfPersonPage(text) {
    const personInfoboxPattern = /\{\{Kişi bilgi kutusu/;
    const birthCategoryPattern = /\[\[Kategori:.*? doğumlular\]\]/;
    const livingPeopleCategoryPattern = /\[\[Kategori:Yaşayan insanlar\]\]/;
    const peopleCategoryPattern = /\[\[Kategori\:.+kişi.+\]\]/;

    return personInfoboxPattern.test(text) ||
           birthCategoryPattern.test(text) ||
           livingPeopleCategoryPattern.test(text) ||
           peopleCategoryPattern.test(text);
}