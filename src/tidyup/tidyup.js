module.exports = {
    fix: fix
};

function fix(text) {
    return text.map(function(x) {
        var xNew = x.value.replace(/"/g, '').replace(/\+/g, '').replace(/ /g, '');
        x.value = xNew;
        return x;
    });
}
