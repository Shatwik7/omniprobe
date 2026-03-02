const assert = require('assert');

function helloWorld() {
    return 'Hello, World!';
}

test('hello world function returns correct string', () => {
    assert.strictEqual(helloWorld(), 'Hello, World!');
});