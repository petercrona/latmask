module.exports = {
    toJs: toJs,
    write: write
};

var _ = require('kling/kling.js');
var fs = require('fs');

function write(path, content) {
    var title = path.substring(2, path.lastIndexOf('.'));
    var firstChar = title[0].toUpperCase();
    title = firstChar + title.substring(1);
    content = '\n' + title + '\n----------------------\n' + content;
    fs.writeFile(camelToDash(path), content + '\n', 'utf8');
}

function camelToDash(str) {
    var dashStr = '';

    for (var i = 0; i < str.length; i++) {
        var subject = str[i];
        if (subject.match(/[A-Z]/) !== null && str[i-1] !== str[i-1].toUpperCase()) {
            dashStr = dashStr + '-' + subject.toLowerCase();
        } else {
            dashStr = dashStr + str[i].toLowerCase();
        }
    }
    return dashStr;
}

function toJs(file, parsedResult) {
    if (parsedResult.length === 0) {
        return null;
    }

    var resourceName = getResourceName(file.name);
    var baseUrl = getResourceUrl(parsedResult);
    var placeHolder = baseUrl.match(/{[^}]+}/);

    var urlRewrites = getRewrites(placeHolder);
    baseUrl = url(baseUrl, urlRewrites);

    var buffer = '';

    var parsedResultRenamed = renameDuplicates(parsedResult);
    parsedResultRenamed = renameReserved(parsedResultRenamed);

    parsedResultRenamed.map(function(x) {
        if (x.name !== 'class') {
            buffer = buffer + writeMethod(x, urlRewrites);
        }
    });

    return {
        name: resourceName,
        content: buffer
    };
}

function renameReserved(parsedResult) {
    return parsedResult.map(function(x) {
        if (x.name === 'delete') {
            x.name = 'remove';
        }
        return x;
    });
}

function renameDuplicates(parsedResult) {
    var foundMethods = {};
    return parsedResult.map(function(x) {
        if (!foundMethods[x.name]) {
            foundMethods[x.name] = 1;
        } else {
            foundMethods[x.name]++;
            x.name = x.name + foundMethods[x.name];
        }
        return x;
    });
}

function getRewrites(placeHolder) {
    var urlRewrites = [];
    if (placeHolder !== null) {
        var rewrite = removeFirstAndLastChar(placeHolder[0]);
        if (rewrite !== 'id') {
            urlRewrites.push(rewrite);
        }
    }
    return urlRewrites;
}

function removeFirstAndLastChar(str) {
    return str.substring(1, str.length-1);
}

function removeLastComma(text) {
    return text.substring(0, text.length-2) + '\n';
}

function getResourceName(fileName) {
    return fileName.substring(fileName.lastIndexOf('/')+1, fileName.lastIndexOf('Resource'));
}

// Sort by shortest action. Pick first with placeholder.
function getResourceUrl(parsedResult) {
    var getMethods = parsedResult.filter(function(x) {
        return x.name !== 'class' && url(x.value) !== '';
    });

    var getMethodsSortedByLength = getMethods.sort(function(a,b) {
        return a.value.length - b.value.length;
    });

    var candidate;
    for (key in getMethodsSortedByLength) {
        var x = getMethodsSortedByLength[key];
        if (x.value.indexOf('{') > -1) {
            candidate = x.value;
            break;
        }
    };

    if (!candidate && getMethodsSortedByLength.length > 0) {
        candidate = getMethodsSortedByLength[0].value;
    } else if (!candidate) {
        candidate = parsedResult[0].value;
    }

    return candidate;
}

function isPlaceholder(str) {
    return str[0] === '{' && str[str.length-1] === '}';
}

function isPlaceholderWithId(str) {
    return str[0] === '{' && str[str.length-1] === '}' && str.toLowerCase().indexOf('id') > -1;
}

function writeLn(indentation, text) {
    return ' '.repeat(indentation*4) + text + '\n';
}

function writeAngularInitialBoilerPlate(resourceName, baseUrl, filePath) {
    var idnt0 = _.curry(writeLn)(0);
    var idnt1 = _.curry(writeLn)(1);

    var text = idnt0('// Generated file, don\'t modify directly!');
    var text = text + idnt0('// Based on: ' + getLastElement(filePath, '/') + '\n');

    var text = text + idnt0('module.exports = angular.module(\'si.generted.api.' + resourceName + '\', [');
    var text = text + idnt0(']).factory(\'' + resourceName + '\', ' + resourceName + ');');
    var text = text + '\n';

    var text = text + idnt0('function ' + resourceName + '($resource) {');
    var text = text + idnt1('return $resource(\'' + url(baseUrl) + '\', {id: \'@id\'}, {');

    return text;
}

function getLastElement(str, delimiter) {
    return str.substring(str.lastIndexOf(delimiter) + 1);
}

function writeMethod(method, urlRewrites) {
    var idnt2 = _.curry(writeLn)(2);
    var idnt3 = _.curry(writeLn)(3);

    var text = method.name;
    text += ' (' + method.method + '): ';
    text += url(method.value, urlRewrites);

    if (isReturnTypeCollection(method.returnType)) {
        text += ' - returns an array';
    }

    text += '\n';

    return text;
}

function isReturnTypeCollection(returnType) {
    var collectionTypes = {
        'List': true,
        'Collection': true,
        'Set': true,
        'Iterable': true
    };

    var returnTypeBase = returnType.substring(0, returnType.indexOf('<')).trim();
    return collectionTypes[returnTypeBase] !== undefined;
}

function writeAngularTailBoilerPlate(resourceName, baseUrl) {
    var idnt0 = _.curry(writeLn)(0);
    var idnt1 = _.curry(writeLn)(1);

    var text = idnt1('});');
    text = text + idnt0('}');

    return text;
}

function url(url, urlRewrites) {
    if (urlRewrites === undefined) {
        urlRewrites = [];
    }

    url = url.replace('RESOURCE_BASE_PATH', '');
    url = url.replace('RESOURCE_PUBLISHED_BASE_PATH', '');
    url = url.replace(/{/g, ':');
    url = url.replace(/}/g, '');

    urlRewrites.map(function(x) {
        var re = new RegExp(':'+x, 'g');
        url = url.replace(re, ':id')
    });

    return url;
}
