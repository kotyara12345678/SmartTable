// Simple test to check what require('electron') returns
const electron = require('electron');
console.log('Type of require("electron"):', typeof electron);
console.log('Value:', electron);

if (typeof electron === 'string') {
  console.log('ERROR: require("electron") returned a string instead of an object');
  console.log('This means the Electron API is not available');
} else if (electron && electron.app) {
  console.log('SUCCESS: Electron API is available');
  console.log('Electron version:', electron.app.getVersion());
} else {
  console.log('ERROR: Electron API is not properly loaded');
}
