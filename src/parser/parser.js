module.exports = {
    parse
};

var sluka = require('sluka/sluka.js');
var parserRules = require('./parser-rules.js');

function parse(text) {
    console.log('\n\n\n============= START \n\n\n');
    const classAnnotations = getClassAnnotations(text);
    console.log(classAnnotations);
    return classAnnotations;
}

function getClassAnnotations(text) {
    var annotations = {};
    const consumer = sluka.consumeFirstMatchAnywhere(
        ['@RequestMapping', 'class', '@RolesAllowed']
    );

    var rest = text;
    var consumed = '';
    while(consumed !== null && rest !== null && consumed !== 'class') {
        var result = consumer(rest);
        consumed = result.consumed;
        rest = result.rest;
        annotations[consumed] = consumeByRule(consumed, rest);
    }

    return annotations;
}

function consumeByRule(rule, text) {
    return parserRules.parseWithRule(rule, text);
}

function getMethodAnnotations() {

}

function getMethodReturnType() {

}

function getMethodName() {

}
