module.exports = {
  STABLE_TOKEN: {
    NAME: 'StableToken',
    SYMBOL: 'ST',
    DECIMALS: 6,
  },
  AMOUNT: '10000',
  NON_DEFAULT_THRESHOLD: '3',
  REQ_ID_0: '0',
  REQ_ID_1: '1',
  REQ_ID_2: '2',
  REQ_ID_3: '3',
  RequestStatus: {
    IN_PROGRESS: '0',
    ACCEPTED: '1',
    EXECUTED: '2',
    CANCELLED: '3',
  },
  RequestType: {
    TOKEN_SUPPLY_CONTROL: '0',
    TRANSACTION_CONTROL: '1',
    SIGNATORY_CONTROL: '2',
    THRESHOLD_CONTROL: '3',
    WHITELIST_CONTROL: '4',
  },
  TokenSupplyControlRequestType: {
    BURN: '0',
    MINT: '1',
  },
  TransactionControlRequestType: {
    PAUSE: '0',
    UNPAUSE: '1',
  },
  SignatoryControlRequestType: {
    REMOVE: '0',
    ADD: '1',
  },
  ThresholdControlRequestType: {
    UPDATE: '0',
  },
  WhiteListControlRequestType: {
    REMOVE: '0',
    ADD: '1',
  },
  RequestSubTypeCount: {
    TOKEN_SUPPLY_CONTROL: 2,
    TRANSACTION_CONTROL: 2,
    SIGNATORY_CONTROL: 2,
    THRESHOLD_CONTROL: 1,
    WHITELIST_CONTROL: 2,
  },
};
