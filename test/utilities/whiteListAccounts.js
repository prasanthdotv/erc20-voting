const { accounts } = require('@openzeppelin/test-environment');

const { REQ_ID_0, RequestType, WhiteListControlRequestType } = require('../constants');

const [owner, user1, user2, user3] = accounts;

module.exports = async (token) => {
  await token.createWhiteListControlRequest(
    WhiteListControlRequestType.ADD,
    REQ_ID_0,
    [owner, user1, user2, user3, token.address],
    {
      from: owner,
    }
  );

  await token.vote(RequestType.WHITELIST_CONTROL, REQ_ID_0, true, {
    from: owner,
  });
  await token.execute(RequestType.WHITELIST_CONTROL, REQ_ID_0, {
    from: owner,
  });
};
