module.exports = {
    start: start
};

var reader = require('./reader/reader.js');
var parser = require('./parser/parser.js');
var siWriter = require('./writer/writer.js');
var tidyup = require('./tidyup/tidyup.js');
var _ = require('kling/kling.js');

function start(args) {
    var parsedArgs = parseArgs(args);
    var parseFileWithDestination = _.curry(parseFile)(parsedArgs.destination);
    var stop = printStartMessage();

    reader.readFiles(parsedArgs.source, 'Resource.java')
        .then(_.fmap(parseFileWithDestination))
        .then(stop);
}

function parseArgs(args) {
    if (args.length < 2) {
        throw 'Missing args. Specify source directory and destination directory.';
    } else {
        return {
            source: args[0],
            destination: args[1]
        };
    }
}

function parseFile(destinationDir, file) {
    var fileContents = file.getContents();
    var parsedResult = parser.parse(fileContents);
    parsedResult = tidyup.fix(parsedResult);

    var js = siWriter.toJs(file, parsedResult);
    if (js) {
        var name = lowerCaseFirst(js.name);
        siWriter.write(destinationDir+'/'+name+'.js', js.content);
    }
}

function printStartMessage() {
    console.log('\n== Starting now!');
    return function printStopMessage() {
        console.log('== I\'m done! Enjoy your freshly baked JS API client!\n');
    }
}

function lowerCaseFirst(name) {
    return name[0].toLowerCase() + name.substring(1);
}
