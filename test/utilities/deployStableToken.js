const { accounts, contract } = require('@openzeppelin/test-environment');

const StableCoin = contract.fromArtifact('StableCoin');

const { STABLE_TOKEN } = require('../constants');

const [owner] = accounts;
const { NAME, SYMBOL, DECIMALS } = STABLE_TOKEN;

module.exports = async () => {
  this.stableCoin = await StableCoin.new({
    from: owner,
  });
  await this.stableCoin.initialize(NAME, SYMBOL, DECIMALS, owner, {
    from: owner,
  });
  return this.stableCoin;
};
