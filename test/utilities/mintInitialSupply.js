const { accounts } = require('@openzeppelin/test-environment');
const { BN } = require('@openzeppelin/test-helpers');

const {
  STABLE_TOKEN,
  AMOUNT,
  REQ_ID_0,
  RequestType,
  TokenSupplyControlRequestType,
} = require('../constants');

const [owner] = accounts;

module.exports = async (token) => {
  const DECIMAL_BN = new BN(STABLE_TOKEN.DECIMALS);
  const AMOUNT_BN = new BN(AMOUNT).mul(BN(10).pow(DECIMAL_BN));

  await token.createTokenSupplyControlRequest(
    TokenSupplyControlRequestType.MINT,
    REQ_ID_0,
    AMOUNT_BN,
    owner,
    {
      from: owner,
    }
  );

  await token.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_0, true, {
    from: owner,
  });

  await token.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_0, {
    from: owner,
  });
};
