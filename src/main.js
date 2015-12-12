module.exports = {
    start: start
};

var reader = require('./reader/reader.js');
var parser = require('./parser/parser.js');

var _ = require('kling/kling.js');

function start(args) {
    var parsedArgs = parseArgs(args);
    var parseFileWithDestination = _.curry(parseFile)(parsedArgs.destination);
    var stop = printStartMessage();

    reader.readFiles(parsedArgs.source, 'Resource.java')
        .then(_.fmap(parseFileWithDestination))
        .then(stop);
}

function parseFile(destinationDir, file) {
    var fileContents = file.getContents();
    var result = parser.parse(fileContents);
    //console.log(result);
}

function printStartMessage() {
    console.log('\n== Starting now!');
    return function printStopMessage() {
        console.log('== I\'m done! Enjoy your freshly baked JS API client!\n');
    }
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
