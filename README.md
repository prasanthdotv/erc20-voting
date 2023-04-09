## Token Contracts

### Common Contract

This is a contract written in solidity language, which will be inherited on token contracts. It consists common functions and storage elements used in Stable Coin.

### Stable Coin Contract

This is a solidity language, ERC-20 standard token. It also have additional features signatoryControl, tokenSupplyControl, transactionControl and thresholdControl.

## Contracts by truffle-upgrade for deploying contracts

### Proxy admin

A ProxyAdmin is a contract that acts as the owner of all your proxies. Only one per network gets deployed. When you start your project, the ProxyAdmin is owned by the deployer address, but you can transfer ownership of it by calling transferOwnership.

### Transparent Upgradeable Proxy

A proxy is a contract that delegates all of its calls to a second contract, named an implementation contract. All state and funds are held in the proxy, but the code actually executed is that of the implementation. A proxy can be upgraded by its admin to use a different implementation contract.

## Tools and Framework

### Git

Git is software for tracking changes in any set of files, usually used for coordinating work among programmers collaboratively developing source code during software development. Its goals include speed, data integrity, and support for distributed, non-linear workflows.

### Truffle

Truffle is a world-class development environment, testing framework and asset pipeline for blockchains using the Ethereum Virtual Machine (EVM), aiming to make life as a developer easier. We use truffle in this project to compile and deploy the StableCoin contracts in specified network

## Prerequisite

### Install Git

Run below commands

```bash
    sudo apt install git-all
```

### Install NodeJS

Run below commands

```bash
    curl -fsSL https://deb.nodesource.com/setup_lts.x |sudo -E bash -
    sudo apt-get install -y nodejs
```

### Install truffle

Run below commands

```bash
    sudo npm install truffle -g
```

## Versions used

- Ubuntu - 22.04.1 LTS
- Git - 2.34.1
- NodeJs - v16.18.0
- Node Package Manager(NPM) - 8.19.2
- Truffle - 5.6.3
- Solidity - 0.8.4

## Initial Setup

1. Clone Contract Repo from `https://github.com/prasanthdotv/erc20-voting.git`
2. Open Terminal in the Contract project folder and run `npm install` to install the dependencies.

## Contract Testing (optional)

1. Open Terminal in the StableCoin Contract project folder.
2. Comment the following part on contract

```sol
 constructor() {
  _disableInitializers();
}
```

3. Run `truffle test` or `npm run test` to run the Contract test cases
4. Test report will be generated in both JSON and HTML formats
   `./mochawesome-report/ 'Tokens-Test-Report'.json`

   `./mochawesome-report/ 'Tokens-Test-Report'.html`

## Configurations

### Environment variables

In order to compile and deploy the contract, there are certain values to be set in environment variable.
Make a copy of `.env.sample` and rename it as `.env`
Create a new `.env` file and put :

1. INFURA_KEY Infura API Key,
2. ETHERSCAN_KEY if you work on ethereum and want to verify contract on ethereum network.
3. BSCSCAN_KEY if you work on binance network and want to verify on binance network.
4. MNEMONIC key of a wallet.
5. Name, symbol, decimal and owner address of each of the respective token.

Before starting this section we will understand about .openzeppelin folder. This folder contain set of json files with network names as file name with contents being the contract addresses deployed under that network. This file is one of the key file to track contract deployment and perform change/upgrade.

## Deployment

1. Make sure contract contract configurations are correct
2. Set the environment variables as required
3. Deploy contract with below command

   `truffle migrate --f 1 --to 2 --network network_name`

   where network_name = goerli,live, bsc_testnet, bsc, etc.

### Verifying contract (truffle-plugin-verify)

A Truffle plugin that can be used to automatically verify your Truffle contracts through the Etherscan API. With this plugin you can verify your contracts with just a simple command:

`truffle run verify ContractName --network network_name `

## Upgrading contract

1. Create a copy of contract you intend to modify. name it as easy it is to understand.
2. Write the changes in the new file we copied and also rename the class in the similar pattern based on the new file name
3. After modifying the contract. We will need to Create a new file with increased sequence number for example 2_file_name.js file is the last file then our new file will be 2_upgrade_file_name.js

   ```js
   //StableCoin contract
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
   ```

4. After writing code similar to shown above run `truffle migrate --f 3 --to 3 --network local`
5. This will check all the existing scripts are ran already and will run our new migration script.
