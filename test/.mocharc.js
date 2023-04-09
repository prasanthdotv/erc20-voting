module.exports = {
  exit: true,
  recursive: true,
  timeout: 80000,
  bail: true,
  reporter: 'mochawesome',
  'reporter-options': ["reportFilename= 'Tokens-Test-Report'", 'quiet= true'],
};
