'use strict';

module.exports = {
    parseWithRule: parseWithRule
};

var sluka = require('sluka/sluka.js');

function parseWithRule(rule, text) {
    if (rules[rule] === undefined) {
        throw 'Syntax Error: ' + rule + ' does not exist';
    } else {
        return rules[rule](text);
    }
}

const rules = {
    '@RequestMapping': function(text) {
        var contents = sluka.consumeUntilClosed('(', ')', text);

        try {
            contents = rules.annotationValues(contents.consumed);
        } catch(e) {
            console.log(e);
            throw 'fdsa';
        }
        return contents.consumed;
    },

    '@RolesAllowed': function(text) {
        var contents = sluka.consumeUntilClosed('(', ')', text);
        contents = sluka.throwInit('(', contents.consumed);
        contents = sluka.throwWhitespace(contents.rest);
        contents = rules.value(contents.rest);
        return contents.consumed;
    },

    'class': function(text) {
        var contents = sluka.throwWhitespace(text);
        contents = rules.identifier(contents.rest);
        return contents.consumed;
    },

    'identifier': function(text) {
        var result = sluka.consumeRegexp(/[A-Z][A-Za-z0-9_]*/, text);
        return result;
    },

    'annotationKey': function(text) {
        var result = sluka.consumeRegexp(/[a-z]+/, text);
        return result;
    },

    'value': function(text) {
        if (text[0] === '"') {
            return rules.string(text);
        } else if (text[0] === '{') {
            return rules.list(text);
        } else {
            return rules.identifier(text);
        }
    },

    'list': function(text) {
        var values = [];

        var result = sluka.consumeUntilClosed('{', '}', text);
        result = sluka.throwInit('{', result.consumed);

        do {
            result = sluka.throwInit(',', result.rest);
            result = sluka.throwWhitespace(result.rest);
            result = rules.value(result.rest);
            values.push(result.consumed);
            result = sluka.throwWhitespace(result.rest);
        } while (result.rest[0] === ',');

        return {
            consumed: values,
            rest: result.rest
        };
    },

    'annotationValues': function(text) {
        var values = {};
        var result = sluka.consumeUntilClosed('(', ')', text);
        result = sluka.throwInit('(', result.consumed);

        do {
            result = sluka.throwInit(',', result.rest);
            result = sluka.throwWhitespace(result.rest);
            result = rules.assignment(result.rest);
            values[result.consumed.identifier] = result.consumed.value;
            result = sluka.throwWhitespace(result.rest);
        } while (result.rest[0] === ',');

        return {
            consumed: values,
            rest: result.rest
        };
    },

    'string': function(text) {
        var result = sluka.throwInit('"', text);
        result = sluka.consumeUntil('"', result.rest);
        return result;
    },

    'assignment': function(text) {
        var result = rules.annotationKey(text);
        var identifier = result.consumed;
        result = sluka.throwWhitespace(result.rest);
        result = sluka.throwInit('=', result.rest);
        result = sluka.throwWhitespace(result.rest);
        result = rules.value(result.rest);

        return {
            consumed: {
                identifier: identifier,
                value: result.consumed
            },
            rest: result.rest
        };
    }
};
