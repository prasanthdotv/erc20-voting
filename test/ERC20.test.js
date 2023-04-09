const { expect } = require('chai');
const { accounts } = require('@openzeppelin/test-environment');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const _ = require('lodash');

const { getStableCoin, mintInitialSupply } = require('./utilities');
const { STABLE_TOKEN } = require('./constants');

const [admin, user1, user2, user3] = accounts;

describe('Stable Token - Testing common ERC20 functionalities', () => {
  const { NAME, SYMBOL, DECIMALS } = STABLE_TOKEN;
  const DECIMAL_BN = new BN(DECIMALS);

  beforeEach(async () => {
    this.stableToken = await getStableCoin();
  });

  describe('Deployment', () => {
    it('Deployer is admin', async () => {
      expect(await this.stableToken.owner()).to.equal(admin);
    });
  });

  describe('Metadata', () => {
    it('token metadata is correct', async () => {
      expect(await this.stableToken.name()).to.equal(NAME);
      expect(await this.stableToken.symbol()).to.equal(SYMBOL);
      expect((await this.stableToken.decimals()).eq(DECIMAL_BN)).is.true;
    });
  });

  describe('Token Transfer', async () => {
    it('Users can transfer tokens to other users', async () => {
      await mintInitialSupply(this.stableToken);
      const amountToSendBN = BN(10).mul(BN(10).pow(DECIMAL_BN));
      //owner to user1
      await this.stableToken.transfer(user1, amountToSendBN, {
        from: admin,
      });
      expect((await this.stableToken.balanceOf(user1)).eq(amountToSendBN)).is.true;
      //user1 to user2
      await this.stableToken.transfer(user2, amountToSendBN, {
        from: user1,
      });
      expect((await this.stableToken.balanceOf(user2)).eq(amountToSendBN)).is.true;
    });

    it('Event emitted when tokens are transferred', async () => {
      await mintInitialSupply(this.stableToken);
      const amountToSendBN = BN(10).mul(BN(10).pow(DECIMAL_BN));
      const receipt = await this.stableToken.transfer(user1, amountToSendBN, {
        from: admin,
      });
      expectEvent(receipt, 'Transfer', {
        from: admin,
        to: user1,
        value: amountToSendBN,
      });
    });

    it('Reverts if user tries to transfer tokens without enough balance', async () => {
      await mintInitialSupply(this.stableToken);
      const amountToSendBN = BN(100000).mul(BN(10).pow(DECIMAL_BN));
      await expectRevert(
        this.stableToken.transfer(user2, amountToSendBN, {
          from: user1,
        }),
        'ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance.'
      );
    });
  });

  describe('Allowance', () => {
    it('Approve transfer of available tokens by third-party', async () => {
      await mintInitialSupply(this.stableToken);
      const amountToSendBN = BN(10).mul(BN(10).pow(DECIMAL_BN));
      const balanceOfAdmin = await this.stableToken.balanceOf(admin);
      const balanceOfUser1 = await this.stableToken.balanceOf(user1);
      const balanceOfUser2 = await this.stableToken.balanceOf(user2);
      //approving allowance
      await this.stableToken.approve(user1, amountToSendBN, {
        from: admin,
      });
      //checking allowance
      expect((await this.stableToken.allowance(admin, user1)).eq(amountToSendBN));
      //verifying transaction of approved tokens
      await this.stableToken.transferFrom(admin, user2, amountToSendBN, {
        from: user1,
      });
      expect((await this.stableToken.balanceOf(admin)).eq(balanceOfAdmin.sub(amountToSendBN)));
      expect((await this.stableToken.balanceOf(user1)).eq(balanceOfUser1));
      expect((await this.stableToken.balanceOf(user2)).eq(balanceOfUser2.add(amountToSendBN)));
    });

    it('Event emitted someone approves transfer of available tokens by third-party', async () => {
      await mintInitialSupply(this.stableToken);
      const amountToSendBN = BN(10).mul(BN(10).pow(DECIMAL_BN));
      const receipt = await this.stableToken.approve(user1, amountToSendBN, {
        from: admin,
      });
      expectEvent(receipt, 'Approval', {
        owner: admin,
        spender: user1,
        value: amountToSendBN,
      });
    });

    it('Increase allowance', async () => {
      await mintInitialSupply(this.stableToken);
      const amountToSendBN = BN(10).mul(BN(10).pow(DECIMAL_BN));
      const increasedAmountBN = BN(5).mul(BN(10).pow(DECIMAL_BN));
      await this.stableToken.approve(user1, amountToSendBN, {
        from: admin,
      });
      expect((await this.stableToken.allowance(admin, user1)).eq(amountToSendBN));
      await this.stableToken.increaseAllowance(user1, increasedAmountBN, {
        from: admin,
      });
      expect(
        (await this.stableToken.allowance(admin, user1)).eq(amountToSendBN.add(increasedAmountBN))
      );
    });

    it('Decrease allowance', async () => {
      await mintInitialSupply(this.stableToken);
      const amountToSendBN = BN(10).mul(BN(10).pow(DECIMAL_BN));
      const increasedAmountBN = BN(5).mul(BN(10).pow(DECIMAL_BN));
      await this.stableToken.approve(user1, amountToSendBN, {
        from: admin,
      });
      expect((await this.stableToken.allowance(admin, user1)).eq(amountToSendBN));
      await this.stableToken.increaseAllowance(user1, increasedAmountBN, {
        from: admin,
      });
      expect(
        (await this.stableToken.allowance(admin, user1)).eq(amountToSendBN.sub(increasedAmountBN))
      );
    });

    it('Revert when trying to approve transfer of unavailable tokens by third-party', async () => {
      await mintInitialSupply(this.stableToken);
      const amountToSendBN = BN(10).mul(BN(10).pow(DECIMAL_BN));
      //approving allowance
      await this.stableToken.approve(user2, amountToSendBN, {
        from: user1,
      });
      //checking allowance
      expect((await this.stableToken.allowance(user1, user2)).eq(amountToSendBN));
      //verifying transaction of approved tokens
      await expectRevert(
        this.stableToken.transferFrom(user1, user3, amountToSendBN, {
          from: user2,
        }),
        'ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance.'
      );
    });

    it('Revert when trying to transfer more than allowed tokens by third-party', async () => {
      await mintInitialSupply(this.stableToken);
      const amountToSendBN = BN(10).mul(BN(10).pow(DECIMAL_BN));
      //approving allowance
      await this.stableToken.approve(user1, amountToSendBN, {
        from: admin,
      });
      //checking allowance
      expect((await this.stableToken.allowance(admin, user1)).eq(amountToSendBN));
      //verifying transaction of approved tokens
      await expectRevert(
        this.stableToken.transferFrom(admin, user2, amountToSendBN.add(BN(1000)), {
          from: user1,
        }),
        'ERC20: insufficient allowance -- Reason given: ERC20: insufficient allowance.'
      );
    });
  });

  describe('Ownership', () => {
    it('Transferring ownership', async () => {
      await this.stableToken.transferOwnership(user1, { from: admin });
      expect(await this.stableToken.owner()).to.equal(user1);
    });

    it('Event emitted on transferring ownership', async () => {
      const receipt = await this.stableToken.transferOwnership(user1, {
        from: admin,
      });
      expectEvent(receipt, 'OwnershipTransferred', {
        previousOwner: admin,
        newOwner: user1,
      });
    });

    it('Revert when some user other than owner tries to transfer ownership', async () => {
      await expectRevert(
        this.stableToken.transferOwnership(user1, { from: user2 }),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.'
      );
    });

    it('Renounce ownership', async () => {
      await this.stableToken.renounceOwnership({ from: admin });
      expect(await this.stableToken.owner()).to.not.equal(admin);
    });

    it('Revert when some user other than owner tries to renounce ownership', async () => {
      await expectRevert(
        this.stableToken.renounceOwnership({ from: user2 }),
        'Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.'
      );
    });
  });
});
