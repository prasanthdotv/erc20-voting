const { accounts } = require('@openzeppelin/test-environment');

const { REQ_ID_0, RequestType, SignatoryControlRequestType } = require('../constants');

const [owner, user1, user2, user3] = accounts;

module.exports = async (token) => {
  await token.createSignatoryControlRequest(
    SignatoryControlRequestType.ADD,
    REQ_ID_0,
    [user1, user2, user3],
    {
      from: owner,
    }
  );

  await token.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_0, true, {
    from: owner,
  });

  await token.execute(RequestType.SIGNATORY_CONTROL, REQ_ID_0, {
    from: owner,
  });
};
