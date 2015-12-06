module.exports = {
    readFiles: readFiles
};

var filewalker = require('filewalker');
var _ = require('kling/kling.js');
var fs = require('fs');

function readFiles(directory, fileSuffix) {
    return new Promise(function(resolve, reject) {
        var files = [];
        filewalker(directory)
            .on('file', function(file) {
                if (file.endsWith(fileSuffix)) {
                    files.push(file);
                }
            })
            .on('done', function() {
                var addLazyReaderCurried = _.curry(addLazyReader);
                resolve(_.fmap(addLazyReaderCurried(directory), files));
            })
            .walk();
    });
}

function addLazyReader(directory, file) {
    return {
        name: directory+file,
        getContents: function() {
            return fs.readFileSync(directory+file, 'utf8');
        }
    };
}
