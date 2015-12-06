var latmask = require('./src/main.js');
try {
    latmask.start(process.argv.slice(2));
} catch(err) {
    console.log(err);
}

process.on('uncaughtException', function(err) {
    console.log(err);
});
