module.exports = {
    parse: parse
};

var _ = require('kling/kling.js');

function parse(text) {
    var parseRecursiveWithMemo = _.curry(parseRecursive)([]);
    var trim2DMatrix = _.curry(map2DMatrix)(trim);

    var parser = _.compose(
        moveInfoToMethods,
        normalizeMethod,
        toMap,
        removeEmpty,
        parseAssignment,
        trim2DMatrix,
        parseRecursiveWithMemo
    );
    return parser(text);
}

function moveInfoToMethods(text) {
    var classData = {
        method: 'GET',
        value: ''
    };

    var updatedText = text.map(function(x) {
        if (x.name === 'class') {
            classData = updateMethodData(classData, x);
        } else {
            x = updateMethodDataIfNotSet(x, classData);
        }
        return x;
    });

    return updatedText;
}

function updateMethodData(currentMethodData, methodData) {
    if (methodData.method) {
        currentMethodData.method = methodData.method;
    }
    if (methodData.value) {
        currentMethodData.value = methodData.value;
    }

    return currentMethodData;
}

function updateMethodDataIfNotSet(currentMethodData, methodData) {
    if (!currentMethodData.method && methodData.method) {
        currentMethodData.method = methodData.method;
    }
    if (methodData.value) {
        var slash = '';
        if (!methodData.value.endsWith('/') &&
            removeQuotes(currentMethodData.value)[0] !== '/' &&
            currentMethodData.value) {
            slash = '/';
        }
        currentMethodData.value = methodData.value + slash + removeQuotes(currentMethodData.value);
    }
    return currentMethodData;
}

function removeQuotes(str) {
    if (!str) {
        return '';
    }

    if (str[0] === '"' && str[str.length-1] === '"') {
        return str.substring(1, str.length-1);
    } else {
        return str;
    }
}

function toMap(text) {
    return text.map(function(keyValuePair) {
        var map = {};
        keyValuePair.map(function(x) {
            map[x[0]] = x[1];
        });
        return map;
    });
}

function normalizeMethod(text) {
    return text.map(function(x) {
        if (x.method) {
            x.method = x.method.substring(x.method.lastIndexOf('.')+1);
        }
        return x;
    });
}

function removeEmpty(text) {
    return text.filter(function(x) {
        return x.length > 1;
    });
}

function parseRecursive(output, text) {
    var requestMapping = consume('@RequestMapping');
    var parseResultMapping = requestMapping(text);
    var parseResult = consumeUntilClosingParanthesis(parseResultMapping.rest, '(', ')');

    if (parseResult.result === null) {
        return output;
    }

    var result = parseLine(parseResult.result);

    var methodInfo = getMethodInfo(parseResult.rest);
    var methodName = methodInfo.name;
    var methodReturnType = methodInfo.returnType;

    result.push('name = ' + methodName);
    result.push('returnType =' + methodReturnType);

    output.push(result);
    return parseRecursive(output, parseResult.rest);
}

function getMethodInfo(text) {
    var untilMethodDeclaration = consumeUntilOr([') {', 'throws']);
    var everythingUntilStartOfMethodBody = untilMethodDeclaration(text).result;
    var lines = everythingUntilStartOfMethodBody.split('\n').map(trim).filter(notEmpty);

    var methodInfo = getMethodNameFromLines(lines);
    var methodName = methodInfo.name;
    var methodReturnType = methodInfo.returnType;

    return {
        returnType: methodReturnType,
        name: methodName.substring(0, methodName.indexOf('(')),
    };
}

function getMethodNameFromLines(lines) {
    var linesWithMethod = lines.map(getMethodInfoFromTokens).filter(_.identity).filter(notEmpty);
    if (linesWithMethod.length === 1) {
        return linesWithMethod[0][0];
    } else {
        return {
            returnType: undefined,
            name: 'class('
        };
    }
}

function getMethodInfoFromTokens(tokensArg) {
    var tokens = tokensArg.split(' ').map(trim);
    var isClassAnnotation = false;

    var result = Object.keys(tokens).map(function(key) {
        var token = tokens[key];

        if (!isClassAnnotation) {
            isClassAnnotation = token === 'class';
        }

        if (!isClassAnnotation && (isJavaType(token) || isPrimitiveType(token))) {
            if (tokens.length-1 > key && isMethodName(tokens[parseInt(key)+1])) {
                return {
                    returnType: loadWholeReturnType(tokens, key),
                    name: tokens[parseInt(key)+1]
                };
            }
        } else if (isClassAnnotation) {
            return {
                returnType: undefined,
                name: ['class']
            };
        } else {
            return false;
        }
    });

    return result.filter(function(x) { return x;});
}

function loadWholeReturnType(tokens, keyOfEnd) {
    if (tokens[keyOfEnd].indexOf('>') > -1) {
        return handleGenericReturnType(tokens, keyOfEnd);
    } else {
        return tokens[keyOfEnd];
    }
}

function handleGenericReturnType(tokens, keyOfEnd) {
    var tokenSubset = tokens.slice(
        0,
        parseInt(keyOfEnd)+1);

    var reversed = reverseString(tokenSubset.join(' '));
    var consumed = consumeUntilClosingParanthesis(reversed, '>', '<');
    var untilStartOfReturnType = getUntilUpperCase(consumed.rest);

    return reverseString(untilStartOfReturnType) + reverseString(consumed.result);
}

function reverseString(str) {
    return str.split('').reverse().join('');
}

function getUntilUpperCase(text) {
    for (var i = 0; i < text.length; i++) {
        if (isUpperCase(text[i])) {
            break;
        }
    }
    return text.substring(0, i+1);
}

function isMethodName(potentialMethodName) {
    return potentialMethodName.match(/^[a-z][a-zA-Z0-9]+[ ]*\(/) !== null;
}

function isJavaType(token) {
    return token.length > 0 && isUpperCase(token.charAt(0));
}

function isUpperCase(character) {
    return character === character.toUpperCase();
}

function isPrimitiveType(token) {

    var primitiveTypes = {
        byte: true,
        short: true,
        int: true,
        long: true,
        float: true,
        double: true,
        boolean: true,
        char: true,
        'void': true
    };

    var startOfArray = token.lastIndexOf('[');
    var token;
    if (startOfArray > -1) {
        token = token.substring(0, startOfArray);
    }
    return primitiveTypes[token] !== undefined;
}

function notEmpty(x) {
    return x.length > 0;
}

function parseLine(line) {
    return parseParams(init(consume('(')(line).rest));
}

function parseParams(params) {
    return params.split(',');
}

function parseAssignment(param) {
    var getLRValue = _.compose(map(trim), split('='));
    return map2DMatrix(getLRValue, param);
}

function consumeLine(characters) {
    return function(data) {
        const startPos = data.indexOf(characters);
        const endPos = data.indexOf('\n', startPos);

        if (startPos === -1 || endPos === -1) {
            return result(null, null);
        }

        const collected = data.substring(startPos, endPos);
        return result(collected, data.substring(endPos));
    }
}

function consumeUntil(characters) {
    return consumeUntilOr([characters]);
}

function consumeUntilClosingParanthesis(text, openParanthesis, closeParanthesis) {
    if (text === null) {
        return result(null, null);
    }

    var current = consume(openParanthesis)(text);
    var open = 1;
    var rest = current.rest;
    var restLength = rest.length;

    for (var i = 0; i < restLength && open > 0; i++) {
        if (rest[i] === openParanthesis) {
            open++;
        } else if (rest[i] === closeParanthesis) {
            open--;
        }
    }

    return result(text.substring(0, i+1), text.substring(i+1));
}

function consumeUntilOr(charactersArray) {
    return function(data) {
        var characters;
        var endPos = 999999999;

        for (var key in charactersArray) {
            characters = charactersArray[key];
            newEndPos = data.indexOf(characters);
            if (newEndPos > -1) {
                endPos = Math.min(newEndPos, endPos);
            }
        }

        if (endPos === -1) {
            return result(null, null);
        }

        const collected = data.substring(0, endPos);
        return result(collected, data.substring(endPos));
    }
}

function consume(characters) {
    return function(data) {
        const endPos = data.indexOf(characters);

        if (endPos === -1) {
            return result(null, null);
        }

        return result(characters, data.substring(endPos + characters.length));
    }
}

function result(collected, rest) {
    return {
        result: collected,
        rest: rest
    };
}

function init(str) {
    return str.substring(0,str.length-1)
}

function map2DMatrix(fn, x) {
    return x.map(function(y) {
        return y.map(fn);
    });
}

function map(fn) {
    return function(x) {
        return x.map(fn);
    }
}

function trim(x) {
    return x.trim();
}

function split(token) {
    return function(x) {
        return x.split(token);
    };
}
