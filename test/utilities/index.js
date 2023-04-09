const getStableCoin = require('./deployStableToken');
const addSignatories = require('./addSignatories');
const mintInitialSupply = require('./mintInitialSupply');
const changeDefaultThresholds = require('./changeDefaultThresholds');
const whiteListAccounts = require('./whiteListAccounts');

module.exports = {
  getStableCoin,
  addSignatories,
  mintInitialSupply,
  changeDefaultThresholds,
  whiteListAccounts,
};
