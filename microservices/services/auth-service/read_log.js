const fs = require('fs');
const path = require('path');

const logPath = './logs/auth-service-error.log';

try {
    const stats = fs.statSync(logPath);
    const size = stats.size;
    const bufferSize = 4096;
    const buffer = Buffer.alloc(bufferSize);
    const fd = fs.openSync(logPath, 'r');

    const start = Math.max(0, size - bufferSize);
    fs.readSync(fd, buffer, 0, bufferSize, start);
    fs.closeSync(fd);

    console.log(buffer.toString('utf8'));
} catch (e) {
    console.error(e);
}
