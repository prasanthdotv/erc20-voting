const { accounts } = require('@openzeppelin/test-environment');

const {
  NON_DEFAULT_THRESHOLD,
  REQ_ID_0,
  RequestType,
  RequestSubTypeCount,
} = require('../constants');

const [owner] = accounts;

module.exports = async (token, reqType) => {
  const requestsType = Object.keys(RequestType);
  const noOfSubTypes = RequestSubTypeCount[requestsType[reqType]];
  const thresholds = [];
  for (let i = 0; i < noOfSubTypes; i++) {
    thresholds.push(NON_DEFAULT_THRESHOLD);
  }

  await token.createThresholdControlRequest(reqType, REQ_ID_0, thresholds, {
    from: owner,
  });

  await token.vote(RequestType.THRESHOLD_CONTROL, REQ_ID_0, true, {
    from: owner,
  });

  await token.execute(RequestType.THRESHOLD_CONTROL, REQ_ID_0, {
    from: owner,
  });
};
