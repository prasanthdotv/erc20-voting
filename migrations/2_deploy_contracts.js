const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const StableCoin = artifacts.require('StableCoin');
const { ST_NAME, ST_SYMBOL, ST_DECIMALS, ST_OWNER } = process.env;

module.exports = async (deployer) => {
  await deployProxy(StableCoin, [ST_NAME, ST_SYMBOL, ST_DECIMALS, ST_OWNER], {
    deployer,
  });
  console.log('Deployed Stable Coin address : ', StableCoin.address);
};
