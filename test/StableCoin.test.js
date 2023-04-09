const { expect } = require('chai');
const { accounts } = require('@openzeppelin/test-environment');
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const _ = require('lodash');

const {
  getStableCoin,
  addSignatories,
  mintInitialSupply,
  changeDefaultThresholds,
} = require('./utilities');
const {
  STABLE_TOKEN,
  REQ_ID_1,
  REQ_ID_2,
  REQ_ID_3,
  AMOUNT,
  NON_DEFAULT_THRESHOLD,
  RequestStatus,
  RequestType,
  RequestSubTypeCount,
  ThresholdControlRequestType,
  TokenSupplyControlRequestType,
  SignatoryControlRequestType,
  TransactionControlRequestType,
} = require('./constants');

const { NAME, SYMBOL, DECIMALS } = STABLE_TOKEN;

const [owner, user1, user2, user3, user4] = accounts;
const USERS = [user1, user2];

describe('Stable Token', () => {
  const DECIMAL_BN = new BN(DECIMALS);
  const AMOUNT_BN = new BN(AMOUNT).mul(BN(10).pow(DECIMAL_BN));

  beforeEach(async () => {
    this.stableToken = await getStableCoin();
  });

  describe('Deployment', () => {
    it('deployer is owner', async () => {
      expect(await this.stableToken.owner()).to.equal(owner);
    });
  });

  describe('Metadata', () => {
    it('Token metadata is correct', async () => {
      expect(await this.stableToken.name()).to.equal(NAME);
      expect(await this.stableToken.symbol()).to.equal(SYMBOL);
      expect((await this.stableToken.decimals()).eq(DECIMAL_BN)).is.true;
    });
  });

  describe('Signatory Control', () => {
    it('Creating a valid signatory control request', async () => {
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );
      const req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(req.id).to.equal(REQ_ID_1);
      expect(req.subType).to.equal(SignatoryControlRequestType.ADD);
      expect(_.isEqual(req.wallets, USERS)).to.be.true;
      expect(req.owner).to.equal(owner);
      expect(req.status).to.equal(RequestStatus.IN_PROGRESS);
    });

    it('Event for signatory control request creation', async () => {
      const receipt = await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_2,
        USERS,
        {
          from: owner,
        }
      );
      expectEvent(receipt, 'RequestCreated', {
        reqType: RequestType.SIGNATORY_CONTROL,
        subType: SignatoryControlRequestType.ADD,
        ownerAddress: owner,
        reqId: REQ_ID_2,
      });
    });

    it('Revert if a non signatory try to make signatory control request', async () => {
      await expectRevert(
        this.stableToken.createSignatoryControlRequest(
          SignatoryControlRequestType.ADD,
          REQ_ID_1,
          USERS,
          {
            from: user3,
          }
        ),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Cancelling signatory control request', async () => {
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );
      await this.stableToken.cancelRequest(RequestType.SIGNATORY_CONTROL, REQ_ID_1, {
        from: owner,
      });
      const req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });

      //checking status is cancelled or not
      expect(req.status).to.equal(RequestStatus.CANCELLED);
    });

    it('Event for cancelling signatory control request', async () => {
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );
      const receipt = await this.stableToken.cancelRequest(
        RequestType.SIGNATORY_CONTROL,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      expectEvent(receipt, 'RequestCancelled', {
        reqType: RequestType.SIGNATORY_CONTROL,
        reqId: REQ_ID_1,
      });
    });

    it('Adding new signatories', async () => {
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
        from: owner,
      });

      await this.stableToken.execute(RequestType.SIGNATORY_CONTROL, REQ_ID_1, {
        from: owner,
      });

      const newSignatoryList = await this.stableToken.getSignatoryList();
      //Adding owner in user list
      expect(_.isEqual(newSignatoryList, [owner, ...USERS]));
    });

    it('Removing signatories', async () => {
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
        from: owner,
      });

      await this.stableToken.execute(RequestType.SIGNATORY_CONTROL, REQ_ID_1, {
        from: owner,
      });

      const newSignatoryList = await this.stableToken.getSignatoryList();
      //Adding owner in user list
      expect(_.isEqual(newSignatoryList, [owner, ...USERS]));

      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.REMOVE,
        REQ_ID_2,
        USERS,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_2, true, {
        from: owner,
      });

      await this.stableToken.execute(RequestType.SIGNATORY_CONTROL, REQ_ID_2, {
        from: owner,
      });

      const finalSignatoryList = await this.stableToken.getSignatoryList();
      expect(_.isEqual(finalSignatoryList, [owner]));
    });

    it('End to end testing for signatory control', async () => {
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );
      let req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });
      //in progress
      expect(req.status).to.equal(RequestStatus.IN_PROGRESS);

      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
        from: owner,
      });

      req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });
      //Accepted
      expect(req.status).to.equal(RequestStatus.ACCEPTED);

      await this.stableToken.execute(RequestType.SIGNATORY_CONTROL, REQ_ID_1, {
        from: owner,
      });
      req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });

      //executed
      expect(req.status).to.equal(RequestStatus.EXECUTED);
    });

    it('Updating signatory control request', async () => {
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );

      let req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.wallets, USERS)).to.be.true;

      await this.stableToken.updateSignatoryControlRequest(REQ_ID_1, [...USERS, user3], {
        from: owner,
      });

      req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });
      expect(_.isEqual(req.wallets, [...USERS, user3])).to.be.true;
    });

    it('Event for updating signatory control request', async () => {
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );
      const receipt = await this.stableToken.updateSignatoryControlRequest(
        REQ_ID_1,
        [...USERS, user3],
        {
          from: owner,
        }
      );
      expectEvent(receipt, 'RequestUpdated', {
        reqType: RequestType.SIGNATORY_CONTROL,
        reqId: REQ_ID_1,
      });
    });

    it('Signatories can vote for signatory control request', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      const req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.approvals, [user1])).to.be.true;
    });

    it('Signatories can withdraw vote for signatory control request', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      let req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.approvals, [user1])).to.be.true;

      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, false, {
        from: user1,
      });
      req = await this.stableToken.getSignatoryControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.approvals, [])).to.be.true;
    });

    it('Revert if a non signatory try to vote', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );

      await expectRevert(
        this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
          from: user4,
        }),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Revert if a non request owner try to execute signatory control request', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      await expectRevert(
        this.stableToken.execute(RequestType.SIGNATORY_CONTROL, REQ_ID_1, {
          from: user1,
        }),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Event emitted when signatory list updated', async () => {
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
        from: owner,
      });
      const receipt = await this.stableToken.execute(RequestType.SIGNATORY_CONTROL, REQ_ID_1, {
        from: owner,
      });

      expectEvent(receipt, 'SignatoriesUpdated', {
        reqType: SignatoryControlRequestType.ADD,
        reqId: REQ_ID_1,
        signatoryAddress: USERS,
      });
    });

    it('Event emitted when signatory control request approved', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );
      const receipt = await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      expectEvent(receipt, 'RequestApproval', {
        reqType: RequestType.SIGNATORY_CONTROL,
        reqId: REQ_ID_1,
        signatoryAddress: user1,
        isApproved: true,
      });
    });

    it('Revert if request owner try to execute signatory control request before getting enough approval', async () => {
      await addSignatories(this.stableToken);
      await changeDefaultThresholds(this.stableToken, RequestType.SIGNATORY_CONTROL);

      await this.stableToken.createSignatoryControlRequest(
        SignatoryControlRequestType.ADD,
        REQ_ID_1,
        USERS,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.SIGNATORY_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      await expectRevert(
        this.stableToken.execute(RequestType.SIGNATORY_CONTROL, REQ_ID_1, {
          from: owner,
        }),
        'NOT_APPROVED! -- Reason given: NOT_APPROVED!.'
      );
    });
  });

  describe('Transaction control', () => {
    it('Creating a valid transaction control request', async () => {
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      const req = await this.stableToken.getTransactionControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(req.id).to.equal(REQ_ID_1);
      expect(req.subType).to.equal(TransactionControlRequestType.PAUSE);
      expect(req.owner).to.equal(owner);
      expect(req.status).to.equal(RequestStatus.IN_PROGRESS);
    });

    it('Event for transaction control request creation', async () => {
      const receipt = await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      expectEvent(receipt, 'RequestCreated', {
        reqType: RequestType.TRANSACTION_CONTROL,
        subType: TransactionControlRequestType.PAUSE,
        ownerAddress: owner,
        reqId: REQ_ID_1,
      });
    });

    it('Revert if a non signatory try to make transaction control request', async () => {
      await expectRevert(
        this.stableToken.createTransactionControlRequest(
          TransactionControlRequestType.PAUSE,
          REQ_ID_1,
          {
            from: user1,
          }
        ),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Cancelling transaction control request', async () => {
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      await this.stableToken.cancelRequest(RequestType.TRANSACTION_CONTROL, REQ_ID_1, {
        from: owner,
      });
      const req = await this.stableToken.getTransactionControlRequest(REQ_ID_1, {
        from: owner,
      });
      //checking status is cancelled or not
      expect(req.status).to.equal(RequestStatus.CANCELLED);
    });

    it('Event for cancelling transaction control request', async () => {
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      const receipt = await this.stableToken.cancelRequest(
        RequestType.TRANSACTION_CONTROL,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      expectEvent(receipt, 'RequestCancelled', {
        reqType: RequestType.TRANSACTION_CONTROL,
        reqId: REQ_ID_1,
      });
    });

    it('Pausing transactions', async () => {
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_1, {
        from: owner,
      });
      expect(await this.stableToken.paused({ from: owner })).to.be.true;
    });

    it('Transactions are not allowed while contract is paused', async () => {
      await mintInitialSupply(this.stableToken);
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_1, {
        from: owner,
      });
      expect(await this.stableToken.paused()).to.be.true;

      const amountToSendBN = BN(50).mul(BN(10).pow(DECIMAL_BN));

      await expectRevert(
        this.stableToken.transfer(user1, amountToSendBN, { from: owner }),
        'Pausable: paused -- Reason given: Pausable: paused.'
      );
    });

    it('Event occur when transaction is paused', async () => {
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: owner,
      });
      const receipt = await this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_1, {
        from: owner,
      });
      expectEvent(receipt, 'Paused');
    });

    it('Unpausing a transaction', async () => {
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_1, {
        from: owner,
      });
      expect(await this.stableToken.paused({ from: owner })).to.be.true;

      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.UNPAUSE,
        REQ_ID_2,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_2, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_2, {
        from: owner,
      });
      expect(await this.stableToken.paused({ from: owner })).to.be.false;
    });

    it('Event occur when transaction is unpaused', async () => {
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_1, {
        from: owner,
      });
      expect(await this.stableToken.paused({ from: owner })).to.be.true;

      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.UNPAUSE,
        REQ_ID_2,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_2, true, {
        from: owner,
      });
      const receipt = await this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_2, {
        from: owner,
      });

      expectEvent(receipt, 'Unpaused');
    });

    it('End to end testing for transaction control flow.', async () => {
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      let req = await this.stableToken.getTransactionControlRequest(REQ_ID_1, {
        from: owner,
      });

      //in progress
      expect(req.status).to.equal(RequestStatus.IN_PROGRESS);

      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: owner,
      });

      req = await this.stableToken.getTransactionControlRequest(REQ_ID_1, {
        from: owner,
      });

      //Accepted
      expect(req.status).to.equal(RequestStatus.ACCEPTED);

      await this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_1, {
        from: owner,
      });
      req = await this.stableToken.getTransactionControlRequest(REQ_ID_1, {
        from: owner,
      });

      //executed
      expect(req.status).to.equal(RequestStatus.EXECUTED);
    });

    it('Signatories can vote for transaction control request', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      const req = await this.stableToken.getTransactionControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.approvals, [user1])).to.be.true;
    });

    it('Signatories can withdraw vote for transaction control request', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      let req = await this.stableToken.getTransactionControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.approvals, [user1])).to.be.true;

      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, false, {
        from: user1,
      });
      req = await this.stableToken.getTransactionControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.approvals, [])).to.be.true;
    });

    it('Revert if a non signatory try to vote', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );

      await expectRevert(
        this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
          from: user4,
        }),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Revert if a non request owner try to execute signatory control request', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      await expectRevert(
        this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_1, {
          from: user1,
        }),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Event emitted when signatory control request approved', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );
      const receipt = await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      expectEvent(receipt, 'RequestApproval', {
        reqType: RequestType.TRANSACTION_CONTROL,
        reqId: REQ_ID_1,
        signatoryAddress: user1,
        isApproved: true,
      });
    });

    it('Revert if request owner try to execute signatory control request before getting enough approval', async () => {
      await addSignatories(this.stableToken);
      await changeDefaultThresholds(this.stableToken, RequestType.TRANSACTION_CONTROL);

      await this.stableToken.createTransactionControlRequest(
        TransactionControlRequestType.PAUSE,
        REQ_ID_1,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.TRANSACTION_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      await expectRevert(
        this.stableToken.execute(RequestType.TRANSACTION_CONTROL, REQ_ID_1, {
          from: owner,
        }),
        'NOT_APPROVED! -- Reason given: NOT_APPROVED!.'
      );
    });
  });

  describe('Token Supply Control', () => {
    it('Creating a valid token supply request', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      const req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_2, {
        from: owner,
      });

      expect(req.id).to.equal(REQ_ID_2);
      expect(req.subType).to.equal(TokenSupplyControlRequestType.MINT);
      expect(BN(req.amount).eq(AMOUNT_BN)).is.true;
      expect(req.wallet).to.equal(user1);
      expect(req.owner).to.equal(owner);
      expect(req.status).to.equal(RequestStatus.IN_PROGRESS);
    });

    it('Event for token supply control request creation', async () => {
      const receipt = await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      expectEvent(receipt, 'RequestCreated', {
        reqType: RequestType.TOKEN_SUPPLY_CONTROL,
        subType: TokenSupplyControlRequestType.MINT,
        ownerAddress: owner,
        reqId: REQ_ID_2,
      });
    });

    it('Revert if a non signatory try to make token supply control request', async () => {
      await expectRevert(
        this.stableToken.createTokenSupplyControlRequest(
          TokenSupplyControlRequestType.MINT,
          REQ_ID_1,
          AMOUNT_BN,
          user1,
          {
            from: user3,
          }
        ),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Cancelling token supply control request', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      await this.stableToken.cancelRequest(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, {
        from: owner,
      });
      const req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_2, {
        from: owner,
      });

      //checking status is cancelled or not
      expect(req.status).to.equal(RequestStatus.CANCELLED);
    });

    it('Event for cancelling token supply control request', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      const receipt = await this.stableToken.cancelRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_2,
        {
          from: owner,
        }
      );
      expectEvent(receipt, 'RequestCancelled', {
        reqType: RequestType.TOKEN_SUPPLY_CONTROL,
        reqId: REQ_ID_2,
      });
    });

    it('Minting tokens to the wallet', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, {
        from: owner,
      });
      const balance = await this.stableToken.balanceOf(user1);
      expect(balance.eq(AMOUNT_BN)).is.true;
    });

    it('Burning Token from owner wallet', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        owner,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, {
        from: owner,
      });

      let balance = await this.stableToken.balanceOf(owner);
      expect(balance.eq(AMOUNT_BN)).is.true;

      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.BURN,
        REQ_ID_3,
        AMOUNT_BN,
        owner,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_3, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_3, {
        from: owner,
      });
      balance = await this.stableToken.balanceOf(owner);
      expect(balance.eq(BN(0))).is.true;
    });

    it('Burning Token from contract address', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        this.stableToken.address,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, {
        from: owner,
      });

      let balance = await this.stableToken.balanceOf(this.stableToken.address);
      expect(balance.eq(AMOUNT_BN));

      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.BURN,
        REQ_ID_3,
        AMOUNT_BN,
        this.stableToken.address,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_3, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_3, {
        from: owner,
      });
      balance = await this.stableToken.balanceOf(this.stableToken.address);
      expect(balance.eq(BN(0)));
    });

    it('Burning Token from another address', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, true, {
        from: owner,
      });
      await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, {
        from: owner,
      });

      expect((await this.stableToken.balanceOf(user1)).eq(AMOUNT_BN)).is.true;

      await this.stableToken.approve(owner, AMOUNT_BN, {
        from: user1,
      });

      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.BURN,
        REQ_ID_3,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_3, true, {
        from: owner,
      });

      await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_3, {
        from: owner,
      });

      expect((await this.stableToken.balanceOf(user1)).eq(BN(0))).is.true;
    });

    it('End to end testing for token supply control flow.', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      let req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_2, {
        from: owner,
      });

      //in progress
      expect(req.status).to.equal(RequestStatus.IN_PROGRESS);

      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, true, {
        from: owner,
      });
      req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_2, {
        from: owner,
      });

      //Accepted
      expect(req.status).to.equal(RequestStatus.ACCEPTED);

      await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_2, {
        from: owner,
      });
      req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_2, {
        from: owner,
      });
      //executed
      expect(req.status).to.equal(RequestStatus.EXECUTED);
    });

    it('Updating token supply request', async () => {
      const NEW_AMOUNT_BN = new BN(100).mul(BN(10).pow(DECIMAL_BN));
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_2,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      let req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_2, {
        from: owner,
      });

      expect(BN(req.amount).eq(AMOUNT_BN)).is.true;
      expect(req.wallet).to.equal(user1);

      await this.stableToken.updateTokenSupplyControlRequest(REQ_ID_2, NEW_AMOUNT_BN, user2, {
        from: owner,
      });

      req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_2, {
        from: owner,
      });

      expect(BN(req.amount).eq(NEW_AMOUNT_BN)).is.true;
      expect(req.wallet).to.equal(user2);
    });

    it('Signatories can vote for token supply control request', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_1,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      const req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.approvals, [user1])).to.be.true;
    });

    it('Signatories can withdraw vote for token supply control request', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_1,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      let req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.approvals, [user1])).to.be.true;

      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, false, {
        from: user1,
      });
      req = await this.stableToken.getTokenSupplyControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.approvals, [])).to.be.true;
    });

    it('Revert if a non signatory try to vote', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_1,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );

      await expectRevert(
        this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, true, {
          from: user1,
        }),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Revert if a non request owner try to execute token supply control request', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_1,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );

      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      await expectRevert(
        this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, {
          from: user1,
        }),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Event emitted when token minted', async () => {
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_1,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, true, {
        from: owner,
      });
      const receipt = await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, {
        from: owner,
      });

      expectEvent(receipt, 'Transfer', {
        from: constants.ZERO_ADDRESS,
        to: user1,
        value: AMOUNT_BN,
      });
    });

    it('Event emitted when token burned', async () => {
      await mintInitialSupply(this.stableToken);

      let balance = await this.stableToken.balanceOf(owner);
      expect(balance.eq(BN(AMOUNT_BN))).is.true;

      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.BURN,
        REQ_ID_3,
        AMOUNT_BN,
        owner,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_3, true, {
        from: owner,
      });
      const receipt = await this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_3, {
        from: owner,
      });
      balance = await this.stableToken.balanceOf(owner);
      expect(balance.eq(BN(0))).is.true;

      expectEvent(receipt, 'Transfer', {
        from: owner,
        to: constants.ZERO_ADDRESS,
        value: AMOUNT_BN,
      });
    });

    it('Event emitted when token supply control request approved', async () => {
      await addSignatories(this.stableToken);
      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_1,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      const receipt = await this.stableToken.vote(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        true,
        {
          from: user1,
        }
      );
      expectEvent(receipt, 'RequestApproval', {
        reqType: RequestType.TOKEN_SUPPLY_CONTROL,
        reqId: REQ_ID_1,
        signatoryAddress: user1,
        isApproved: true,
      });
    });

    it('Revert if request owner try to execute signatory control request before getting enough approval', async () => {
      await addSignatories(this.stableToken);
      await changeDefaultThresholds(this.stableToken, RequestType.TOKEN_SUPPLY_CONTROL);

      await this.stableToken.createTokenSupplyControlRequest(
        TokenSupplyControlRequestType.MINT,
        REQ_ID_1,
        AMOUNT_BN,
        user1,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      await expectRevert(
        this.stableToken.execute(RequestType.TOKEN_SUPPLY_CONTROL, REQ_ID_1, {
          from: owner,
        }),
        'NOT_APPROVED! -- Reason given: NOT_APPROVED!.'
      );
    });
  });

  describe('Threshold Control', () => {
    const RequestsTypes = Object.keys(RequestType);
    RequestsTypes.pop();
    describe('Creating a valid threshold control for requests', () => {
      RequestsTypes.forEach(async (reqType, i) => {
        it(`${reqType}`, async () => {
          const noOfSubTypes = RequestSubTypeCount[reqType];
          const thresholds = [];
          for (let j = 0; j < noOfSubTypes; j++) {
            thresholds.push(NON_DEFAULT_THRESHOLD);
          }

          await this.stableToken.createThresholdControlRequest(
            RequestType[reqType],
            i,
            thresholds,
            {
              from: owner,
            }
          );

          const req = await this.stableToken.getThresholdControlRequest(i, {
            from: owner,
          });

          expect(req.id).to.equal(i.toString());
          expect(req.subType).to.equal(ThresholdControlRequestType.UPDATE);
          expect(_.isEqual(req.thresholds, thresholds)).to.be.true;
          expect(req.owner).to.equal(owner);
          expect(req.status).to.equal(RequestStatus.IN_PROGRESS);
        });
      });
    });

    describe('Event for threshold control request creation', () => {
      RequestsTypes.forEach(async (reqType, i) => {
        const noOfSubTypes = RequestSubTypeCount[reqType];
        const thresholds = [];
        for (let j = 0; j < noOfSubTypes; j++) {
          thresholds.push(NON_DEFAULT_THRESHOLD);
        }
        it(`${reqType}`, async () => {
          const receipt = await this.stableToken.createThresholdControlRequest(
            RequestType[reqType],
            i,
            thresholds,
            {
              from: owner,
            }
          );
          expectEvent(receipt, 'RequestCreated', {
            reqType: RequestType.THRESHOLD_CONTROL,
            subType: ThresholdControlRequestType.UPDATE,
            ownerAddress: owner,
            reqId: BN(i),
          });
        });
      });
    });

    describe('Revert if a non signatory try to make signatory control request', () => {
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      it('TOKEN_SUPPLY_CONTROL', async () => {
        await expectRevert(
          this.stableToken.createThresholdControlRequest(
            RequestType.TOKEN_SUPPLY_CONTROL,
            REQ_ID_1,
            thresholds,
            {
              from: user3,
            }
          ),
          'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
        );
      });
    });

    describe('Cancelling threshold control request', async () => {
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      it('TOKEN_SUPPLY_CONTROL', async () => {
        await this.stableToken.createThresholdControlRequest(
          RequestType.TOKEN_SUPPLY_CONTROL,
          REQ_ID_1,
          thresholds,
          {
            from: owner,
          }
        );
        await this.stableToken.cancelRequest(RequestType.THRESHOLD_CONTROL, REQ_ID_1, {
          from: owner,
        });
        const req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
          from: owner,
        });
        expect(req.status).to.equal(RequestStatus.CANCELLED);
      });
    });

    describe('Event for cancelling signatory control request', async () => {
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      it('TOKEN_SUPPLY_CONTROL', async () => {
        await this.stableToken.createThresholdControlRequest(
          RequestType.TOKEN_SUPPLY_CONTROL,
          REQ_ID_1,
          thresholds,
          {
            from: owner,
          }
        );
        const receipt = await this.stableToken.cancelRequest(
          RequestType.THRESHOLD_CONTROL,
          REQ_ID_1,
          {
            from: owner,
          }
        );
        expectEvent(receipt, 'RequestCancelled', {
          reqType: RequestType.THRESHOLD_CONTROL,
          reqId: REQ_ID_1,
        });
      });
    });

    describe('Updating thresholds', () => {
      RequestsTypes.forEach(async (reqType, i) => {
        it(`${reqType}`, async () => {
          const noOfSubTypes = RequestSubTypeCount[reqType];
          const thresholds = [];
          for (let j = 0; j < noOfSubTypes; j++) {
            thresholds.push(NON_DEFAULT_THRESHOLD);
          }

          await this.stableToken.createThresholdControlRequest(
            RequestType[reqType],
            i,
            thresholds,
            {
              from: owner,
            }
          );
          await this.stableToken.vote(RequestType.THRESHOLD_CONTROL, i, true, { from: owner });
          await this.stableToken.execute(RequestType.THRESHOLD_CONTROL, i, { from: owner });
          let updatedThresholds = await this.stableToken.getThresholds(RequestType[reqType]);
          updatedThresholds = updatedThresholds.map((el) => {
            return BN(el).toString();
          });
          expect(_.isEqual(thresholds, updatedThresholds)).is.true;
        });
      });
    });

    describe('End to end testing', () => {
      RequestsTypes.forEach(async (reqType, i) => {
        it(`${reqType}`, async () => {
          const noOfSubTypes = RequestSubTypeCount[reqType];
          const thresholds = [];
          for (let j = 0; j < noOfSubTypes; j++) {
            thresholds.push(NON_DEFAULT_THRESHOLD);
          }

          await this.stableToken.createThresholdControlRequest(
            RequestType[reqType],
            i,
            thresholds,
            {
              from: owner,
            }
          );

          let req = await this.stableToken.getThresholdControlRequest(i, {
            from: owner,
          });

          expect(req.status).to.equal(RequestStatus.IN_PROGRESS);

          await this.stableToken.vote(RequestType.THRESHOLD_CONTROL, i, true, {
            from: owner,
          });
          req = await this.stableToken.getThresholdControlRequest(i, {
            from: owner,
          });
          //Accepted
          expect(req.status).to.equal(RequestStatus.ACCEPTED);

          await this.stableToken.execute(RequestType.THRESHOLD_CONTROL, i, {
            from: owner,
          });
          req = await this.stableToken.getThresholdControlRequest(i, {
            from: owner,
          });
          //executed
          expect(req.status).to.equal(RequestStatus.EXECUTED);
        });
      });
    });

    it('Updating threshold control request', async () => {
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );

      let req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.thresholds, thresholds)).to.be.true;

      await this.stableToken.updateThresholdControlRequest(REQ_ID_1, [5, 5], {
        from: owner,
      });
      req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
        from: owner,
      });
      expect(_.isEqual(req.thresholds, ['5', '5'])).to.be.true;
    });

    it('Event for updating threshold control request', async () => {
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );

      let req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.thresholds, thresholds)).to.be.true;

      const receipt = await this.stableToken.updateThresholdControlRequest(REQ_ID_1, [5, 5], {
        from: owner,
      });
      expectEvent(receipt, 'RequestUpdated', {
        reqType: RequestType.THRESHOLD_CONTROL,
        reqId: REQ_ID_1,
      });
    });

    it('Updating threshold control request', async () => {
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );

      let req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.thresholds, thresholds)).to.be.true;

      await this.stableToken.updateThresholdControlRequest(REQ_ID_1, [5, 5], { from: owner });
      req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
        from: owner,
      });
      expect(_.isEqual(req.thresholds, ['5', '5'])).to.be.true;
    });

    it('Event for updating threshold control request', async () => {
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );

      let req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
        from: owner,
      });

      expect(_.isEqual(req.thresholds, thresholds)).to.be.true;

      const receipt = await this.stableToken.updateThresholdControlRequest(REQ_ID_1, [5, 5], {
        from: owner,
      });
      expectEvent(receipt, 'RequestUpdated', {
        reqType: RequestType.THRESHOLD_CONTROL,
        reqId: REQ_ID_1,
      });
    });

    it('Signatories can vote for threshold control request', async () => {
      await addSignatories(this.stableToken);
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }

      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.THRESHOLD_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      const req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
        from: owner,
      });
      expect(_.isEqual(req.approvals, [user1])).to.be.true;
    });

    it('Signatories can withdraw vote for threshold control request', async () => {
      await addSignatories(this.stableToken);
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }

      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.THRESHOLD_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      let req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
        from: owner,
      });
      expect(_.isEqual(req.approvals, [user1])).to.be.true;

      await this.stableToken.vote(RequestType.THRESHOLD_CONTROL, REQ_ID_1, false, {
        from: user1,
      });
      req = await this.stableToken.getThresholdControlRequest(REQ_ID_1, {
        from: owner,
      });
      expect(_.isEqual(req.approvals, [])).to.be.true;
    });

    it('Revert if a non signatory try to vote', async () => {
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );
      await expectRevert(
        this.stableToken.vote(RequestType.THRESHOLD_CONTROL, REQ_ID_1, true, {
          from: user1,
        }),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Revert if a non request owner try to execute threshold control request', async () => {
      await addSignatories(this.stableToken);
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.THRESHOLD_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      await expectRevert(
        this.stableToken.execute(RequestType.THRESHOLD_CONTROL, REQ_ID_1, {
          from: user1,
        }),
        'UNAUTHORIZED! -- Reason given: UNAUTHORIZED!.'
      );
    });

    it('Revert if invalid number of thresholds are provided', async () => {
      await addSignatories(this.stableToken);
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j <= noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      await expectRevert(
        this.stableToken.createThresholdControlRequest(
          RequestType.TOKEN_SUPPLY_CONTROL,
          REQ_ID_1,
          thresholds,
          {
            from: owner,
          }
        ),
        'INVALID_THRESHOLD_COUNTS! -- Reason given: INVALID_THRESHOLD_COUNTS!.'
      );
    });

    it('Event emitted when threshold updated', async () => {
      await addSignatories(this.stableToken);
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }

      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.THRESHOLD_CONTROL, REQ_ID_1, true, {
        from: user1,
      });

      const receipt = await this.stableToken.execute(RequestType.THRESHOLD_CONTROL, REQ_ID_1, {
        from: owner,
      });

      expectEvent(receipt, 'ThresholdUpdated', {
        reqType: RequestType.TOKEN_SUPPLY_CONTROL,
        reqId: REQ_ID_1,
      });
    });

    it('Event emitted when threshold control request approved', async () => {
      await addSignatories(this.stableToken);
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );
      const receipt = await this.stableToken.vote(RequestType.THRESHOLD_CONTROL, REQ_ID_1, true, {
        from: user1,
      });
      expectEvent(receipt, 'RequestApproval', {
        reqType: RequestType.THRESHOLD_CONTROL,
        reqId: REQ_ID_1,
        signatoryAddress: user1,
        isApproved: true,
      });
    });

    it('Revert if request owner try to execute threshold control request before getting enough approval', async () => {
      await addSignatories(this.stableToken);
      await changeDefaultThresholds(this.stableToken, RequestType.THRESHOLD_CONTROL);
      const noOfSubTypes = RequestSubTypeCount['TOKEN_SUPPLY_CONTROL'];
      const thresholds = [];
      for (let j = 0; j < noOfSubTypes; j++) {
        thresholds.push(NON_DEFAULT_THRESHOLD);
      }
      await this.stableToken.createThresholdControlRequest(
        RequestType.TOKEN_SUPPLY_CONTROL,
        REQ_ID_1,
        thresholds,
        {
          from: owner,
        }
      );
      await this.stableToken.vote(RequestType.THRESHOLD_CONTROL, REQ_ID_1, true, {
        from: user1,
      });

      await expectRevert(
        this.stableToken.execute(RequestType.THRESHOLD_CONTROL, REQ_ID_1, {
          from: owner,
        }),
        'NOT_APPROVED! -- Reason given: NOT_APPROVED!.'
      );
    });
  });
});
