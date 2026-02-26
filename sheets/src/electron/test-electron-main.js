// Test script to check if electron loads correctly
const electron = require('electron');
console.log('Type of electron:', typeof electron);
console.log('Electron:', electron);

if (typeof electron === 'string') {
  console.log('ERROR: electron is a string path, not a module!');
  console.log('This should not happen when running via electron CLI');
} else if (electron && electron.app) {
  console.log('SUCCESS: electron.app:', electron.app);
} else {
  console.log('ERROR: electron does not have app property');
}
