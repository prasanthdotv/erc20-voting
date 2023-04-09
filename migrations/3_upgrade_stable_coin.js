const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const StableCoin = artifacts.require('StableCoin');
const StableCoinV2 = artifacts.require('StableCoinV2');

module.exports = async function (deployer) {
  const existing = await StableCoin.deployed();
  await upgradeProxy(existing.address, StableCoinV2, {
    deployer,
  });
  console.log('Deployed Stable Coin address : ', StableCoin.address);
};
