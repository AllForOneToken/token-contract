const { assert } = require("chai");

const AFOT = artifacts.require("AFOT");
contract("AFOT", (accounts) => {
  const [owner, ordinary, burner, locker, locked, locked2, timeLocked1, investorLocked1, investorLocked2, investorLocked3] = accounts;
  const BigNumber = web3.BigNumber;

  const timeTravel = async function (seconds) {
    await evmIncreaseTime(seconds);
    await evmMine();
  };
  const evmIncreaseTime = function (seconds) {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [seconds], //86,400 is num seconds in day
          id: new Date().getTime(),
        },
        (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        }
      );
    });
  };
  const evmMine = function () {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_mine",
          params: [],
          id: new Date().getTime(),
        },
        (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        }
      );
    });
  };

  require("chai").use(require("chai-as-promised")).use(require("chai-bignumber")(BigNumber)).should();

  describe("1. owner  test", () => {
    it("1-1 should put 10,000,000,000 AFOT in the owner account", async () => {
      let afot = await AFOT.deployed();
      let balance = await afot.balanceOf(owner);
      assert.equal(balance.valueOf(), 3500000000000000000000000000, "10,000,000,000 wasn't in the owner account");
    });
    it("1-2 should hidden owner account is same as owner account", async () => {
      let afot = await AFOT.deployed();
      let hiddenOwnerAddress = await afot.hiddenOwner();
      assert.equal(hiddenOwnerAddress, owner, "owner is not hidden owner");
    });
  });
  describe("2. transfer test", () => {
    it("2-1 should transfer some token to ordinary", async () => {
      let afot = await AFOT.deployed();
      let amount = 1000000;
      await afot.transfer(ordinary, amount, { from: owner });
      let balance = await afot.balanceOf(ordinary);
      assert.equal(amount, balance.valueOf(), "transfer failed");
    });
  });
  describe("3. burner test", () => {
    it("3-1 should set burner properly by owner", async () => {
      let afot = await AFOT.deployed();
      let isBurner = false;

      isBurner = await afot.isBurner(burner);
      assert.isFalse(isBurner, "burner should not be added");

      try {
        await afot.addBurner(burner, { from: ordinary });
      } catch (e) {}
      isBurner = await afot.isBurner(burner);
      assert.isFalse(isBurner, "burner should not be added");

      await afot.addBurner(burner, { from: owner });
      isBurner = await afot.isBurner(burner);
      assert.isTrue(isBurner, "burner should be added");

      try {
        await afot.removeBurner(burner, { from: ordinary });
      } catch (e) {}
      isBurner = await afot.isBurner(burner);
      assert.isTrue(isBurner, "burner should not be removed");

      isBurner = await afot.removeBurner(burner, { from: owner });
      isBurner = await afot.isBurner(burner);
      assert.isFalse(isBurner, "burner should be removed");
    });
    it("3-2 should burn", async () => {
      let afot = await AFOT.deployed();
      let transferredAmount = 2000000;
      let burnedAmount = 1000000;
      let balance = 0;
      let isBurner = false;

      await afot.addBurner(burner, { from: owner });
      isBurner = await afot.isBurner(burner);
      assert.isTrue(isBurner, "burner should be added");

      await afot.transfer(burner, transferredAmount, { from: owner });
      balance = await afot.balanceOf(burner);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");

      await afot.burn(burnedAmount, { from: burner });
      balance = await afot.balanceOf(burner);
      assert.equal(transferredAmount - burnedAmount, balance.valueOf(), "burned failed");

      isBurner = await afot.removeBurner(burner, { from: owner });
      isBurner = await afot.isBurner(burner);
      assert.isFalse(isBurner, "burner should be removed");
    });
  });
  describe("4. locker test", () => {
    it("4-1 should lock and unlock properly by owner", async () => {
      let afot = await AFOT.deployed();
      let isLocker = false;
      isLocker = await afot.isLocker(locker);
      assert.isFalse(isLocker, "locker should not be added");
      try {
        await afot.addLocker(locker, { from: ordinary });
      } catch (e) {}
      isLocker = await afot.isLocker(locker);
      assert.isFalse(isLocker, "locker should not be added");
      await afot.addLocker(locker, { from: owner });
      isLocker = await afot.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      try {
        await afot.removeLocker(locker, { from: ordinary });
      } catch (e) {}
      isLocker = await afot.isLocker(locker);
      assert.isTrue(isLocker, "locker should not be removed");
      isLocker = await afot.removeLocker(locker, { from: owner });
      isLocker = await afot.isLocker(locker);
      assert.isFalse(isLocker, "locker should be removed");
    });
    it("4-2 should lock and transfer", async () => {
      let afot = await AFOT.deployed();
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      await afot.addLocker(locker, { from: owner });
      isLocker = await afot.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await afot.transfer(locked, lockedAmount, { from: owner });
      balance = await afot.balanceOf(locked);
      assert.equal(lockedAmount, balance.valueOf(), "transfer failed");
      await afot.lock(locked, { from: locker });
      try {
        await afot.transfer(owner, lockedAmount, { from: locked });
      } catch (e) {}
      balance = await afot.balanceOf(locked);
      assert.equal(lockedAmount, balance.valueOf(), "transferred");
      await afot.unlock(locked, { from: owner });
      await afot.transfer(owner, lockedAmount, { from: locked });
      balance = await afot.balanceOf(locked);
      assert.equal(0, balance.valueOf(), "transferred");
    });
    it("4-3 should time lock add and remove work right", async () => {
      let afot = await AFOT.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      let timeLockInfo = [];
      await afot.addLocker(locker, { from: owner });
      isLocker = await afot.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await afot.transfer(locked, transferredAmount, { from: owner });
      balance = await afot.balanceOf(locked);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await afot.addTimeLock(locked, lockedAmount, now + 300, { from: locker });
      timeLockLength = await afot.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await afot.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount, "time locked amount is different");
      await afot.addTimeLock(locked, lockedAmount + 100, now + 400, {
        from: locker,
      });
      timeLockLength = await afot.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockedAmount = await afot.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 2 + 100, "time locked amount is different");
      await afot.addTimeLock(locked, lockedAmount + 200, now + 500, {
        from: locker,
      });
      timeLockLength = await afot.getTimeLockLength(locked);
      assert.equal(timeLockLength, 3, "time locked: 3 time");
      timeLockedAmount = await afot.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 3 + 300, "time locked amount is different");
      await afot.addTimeLock(locked, lockedAmount + 300, now + 600, {
        from: locker,
      });
      timeLockLength = await afot.getTimeLockLength(locked);
      assert.equal(timeLockLength, 4, "time locked: 4 time");
      timeLockedAmount = await afot.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 4 + 600, "time locked amount is different");
      timeLockInfo = await afot.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await afot.getTimeLock(locked, 1);
      assert.equal(timeLockInfo[0], lockedAmount + 100, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 400, "expiredAt is not set well");
      timeLockInfo = await afot.getTimeLock(locked, 2);
      assert.equal(timeLockInfo[0], lockedAmount + 200, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 500, "expiredAt is not set well");
      timeLockInfo = await afot.getTimeLock(locked, 3);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      try {
        await afot.removeTimeLock(locked, 2, { from: locker });
      } catch (e) {}
      timeLockLength = await afot.getTimeLockLength(locked);
      assert.equal(timeLockLength, 4, "time locked: 4 time");
      await afot.removeTimeLock(locked, 1, { from: owner });
      timeLockLength = await afot.getTimeLockLength(locked);
      assert.equal(timeLockLength, 3, "time locked: 3 time");
      timeLockInfo = await afot.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await afot.getTimeLock(locked, 1);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockInfo = await afot.getTimeLock(locked, 2);
      assert.equal(timeLockInfo[0], lockedAmount + 200, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 500, "expiredAt is not set well");
      timeLockedAmount = await afot.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 3 + 500, "time locked amount is different");
      await afot.removeTimeLock(locked, 2, { from: owner });
      timeLockLength = await afot.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockInfo = await afot.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 300, "expiredAt is not set well");
      timeLockInfo = await afot.getTimeLock(locked, 1);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockedAmount = await afot.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 2 + 300, "time locked amount is different");
      await afot.removeTimeLock(locked, 0, { from: owner });
      timeLockLength = await afot.getTimeLockLength(locked);
      assert.equal(timeLockLength, 1, "time locked: 2 time");
      timeLockInfo = await afot.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockedAmount = await afot.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount + 300, "time locked amount is different");
      await afot.addTimeLock(locked, lockedAmount + 100, now + 400, {
        from: locker,
      });
      timeLockLength = await afot.getTimeLockLength(locked);
      assert.equal(timeLockLength, 2, "time locked: 2 time");
      timeLockedAmount = await afot.getTimeLockedAmount(locked);
      assert.equal(timeLockedAmount, lockedAmount * 2 + 400, "time locked amount is different");
      timeLockInfo = await afot.getTimeLock(locked, 0);
      assert.equal(timeLockInfo[0], lockedAmount + 300, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 600, "expiredAt is not set well");
      timeLockInfo = await afot.getTimeLock(locked, 1);
      assert.equal(timeLockInfo[0], lockedAmount + 100, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 400, "expiredAt is not set well");
    });
    it("4-4 should time lock and transfer", async () => {
      let afot = await AFOT.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Date.now();
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      await afot.addLocker(locker, { from: owner });
      isLocker = await afot.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await afot.transfer(locked2, transferredAmount, { from: owner });
      balance = await afot.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await afot.addTimeLock(locked2, lockedAmount * 4 + 100, now + 300, {
        from: locker,
      });
      timeLockLength = await afot.getTimeLockLength(locked2);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await afot.getTimeLockedAmount(locked2);
      assert.equal(timeLockedAmount, lockedAmount * 4 + 100, "time locked amount is different");
      try {
        await afot.transfer(owner, lockedAmount, { from: locked2 });
      } catch (e) {}
      balance = await afot.balanceOf(locked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await afot.transfer(owner, lockedAmount - 100, { from: locked2 });
      balance = await afot.balanceOf(locked2);
      assert.equal(transferredAmount - lockedAmount + 100, balance.valueOf(), "transfer failed");
    });
    it("4-5 should time lock expires", async () => {
      let afot = await AFOT.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 1000000;
      let balance = 0;
      let isLocker = false;
      let now = Math.round(new Date().getTime() / 1000);
      let timeLockLength = 0;
      let timeLockedAmount = 0;
      await afot.addLocker(locker, { from: owner });
      isLocker = await afot.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await afot.transfer(timeLocked1, transferredAmount, { from: owner });
      balance = await afot.balanceOf(timeLocked1);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await afot.addTimeLock(timeLocked1, lockedAmount * 4 + 100, now + 2, {
        from: locker,
      });
      timeLockLength = await afot.getTimeLockLength(timeLocked1);
      assert.equal(timeLockLength, 1, "time locked: 1 time");
      timeLockedAmount = await afot.getTimeLockedAmount(timeLocked1);
      assert.equal(timeLockedAmount, lockedAmount * 4 + 100, "time locked amount is different");
      try {
        await afot.transfer(owner, lockedAmount, { from: timeLocked1 });
      } catch (e) {}
      balance = await afot.balanceOf(timeLocked1);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      timeLockInfo = await afot.getTimeLock(timeLocked1, 0);
      assert.equal(timeLockInfo[0], lockedAmount * 4 + 100, "time locked amount is not set well");
      assert.equal(timeLockInfo[1], now + 2, "expiredAt is not set well");
      await timeTravel(3);
      timeLockedAmount = await afot.getTimeLockedAmount(timeLocked1);
      assert.equal(timeLockedAmount, 0, "time locked amount is different");
      await afot.transfer(owner, lockedAmount, { from: timeLocked1 });
      balance = await afot.balanceOf(timeLocked1);
      assert.equal(transferredAmount - lockedAmount, balance.valueOf(), "transfer failed");
    });
    it("4-6 should investor lock add and remove work right", async () => {
      let afot = await AFOT.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 5000000;
      let balance = 0;
      let isLocker = false;
      let months = 5;
      let investorLockedAmount = 0;
      let investorLockInfo = null;
      await afot.addLocker(locker, { from: owner });
      isLocker = await afot.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await afot.transfer(investorLocked1, transferredAmount, { from: owner });
      balance = await afot.balanceOf(investorLocked1);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await afot.addInvestorLock(investorLocked1, months, {
        from: locker,
      });
      investorLockedAmount = await afot.getInvestorLockedAmount(investorLocked1);
      assert.equal(investorLockedAmount, lockedAmount, "investor locked amount is different");
      investorLockInfo = await afot.getInvestorLock(investorLocked1);
      assert.equal(investorLockInfo[0], lockedAmount, "investor locked amount is not set well");
      assert.equal(investorLockInfo[1], months, "investor locked months is not set well");
      try {
        await afot.removeInvestorLock(investorLocked1, { from: locker });
      } catch (e) {}
      investorLockInfo = await afot.getInvestorLock(investorLocked1);
      assert.equal(investorLockInfo[0], lockedAmount, "investor locked amount is not set well");
      investorLockedAmount = await afot.getInvestorLockedAmount(investorLocked1);
      assert.equal(investorLockedAmount, lockedAmount, "investor locked amount is different");
      try {
        await afot.removeInvestorLock(investorLocked1, { from: owner });
      } catch (e) {}
      investorLockInfo = await afot.getInvestorLock(investorLocked1);
      assert.equal(investorLockInfo[0], 0, "investor locked amount is not set well");
      investorLockedAmount = await afot.getInvestorLockedAmount(investorLocked1);
      assert.equal(investorLockedAmount, 0, "investor locked amount is different");
    });
    it("4-7 should investor lock and transfer", async () => {
      let afot = await AFOT.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 5000000;
      let months = 5;
      let balance = 0;
      let isLocker = false;
      let investorLockedAmount = 0;
      await afot.addLocker(locker, { from: owner });
      isLocker = await afot.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await afot.transfer(investorLocked2, transferredAmount, { from: owner });
      balance = await afot.balanceOf(investorLocked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await afot.addInvestorLock(investorLocked2, months, {
        from: locker,
      });
      investorLockedAmount = await afot.getInvestorLockedAmount(investorLocked2);
      assert.equal(investorLockedAmount, lockedAmount, "investor locked amount is different");
      try {
        await afot.transfer(owner, lockedAmount, { from: investorLocked2 });
      } catch (e) {}
      balance = await afot.balanceOf(investorLocked2);
      assert.equal(transferredAmount, balance.valueOf(), "transfer lock failed");
    });
    it("4-8 should investor lock expires", async () => {
      let afot = await AFOT.deployed();
      let transferredAmount = 5000000;
      let lockedAmount = 5000000;
      let balance = 0;
      let months = 5;
      let isLocker = false;
      let oneMonthToSec = 60 * 60 * 24 * 31;
      let releasedAmountPerMonth = 1000000;
      let investorLockedAmount = 0;
      await afot.addLocker(locker, { from: owner });
      isLocker = await afot.isLocker(locker);
      assert.isTrue(isLocker, "locker should be added");
      await afot.transfer(investorLocked3, transferredAmount, { from: owner });
      balance = await afot.balanceOf(investorLocked3);
      assert.equal(transferredAmount, balance.valueOf(), "transfer failed");
      await afot.addInvestorLock(investorLocked3, months, {
        from: locker,
      });
      investorLockedAmount = await afot.getInvestorLockedAmount(investorLocked3);
      assert.equal(investorLockedAmount, lockedAmount, "investor locked amount is different");
      try {
        await afot.transfer(owner, lockedAmount, { from: investorLocked3 });
      } catch (e) {}
      balance = await afot.balanceOf(investorLocked3);
      assert.equal(transferredAmount, balance.valueOf(), "transfer lock failed");
      await timeTravel(oneMonthToSec + 1);
      investorLockedAmount = await afot.getInvestorLockedAmount(investorLocked3);
      assert.equal(investorLockedAmount, lockedAmount - releasedAmountPerMonth, "investor locked amount is different");
      await afot.transfer(owner, releasedAmountPerMonth, {
        from: investorLocked3,
      });
      balance = await afot.balanceOf(investorLocked3);
      assert.equal(transferredAmount - releasedAmountPerMonth, balance.valueOf(), "transfer failed");
    });
  });
  describe("5. token recover test", () => {
    it("5-1 should revert contract address's token to owner", async () => {
      let afot = await AFOT.deployed();
      const contractAddress = afot.address;
      let prevOwnerBalance = await afot.balanceOf(owner);
      let amount = 1000000;
      await afot.transfer(contractAddress, amount, { from: owner });
      let contractBalance = await afot.balanceOf(contractAddress);
      assert.equal(amount, contractBalance.valueOf(), "transfer failed");
      await afot.recoverERC20(contractAddress, amount, { from: owner });
      let ownerBalance = await afot.balanceOf(owner);
      assert.equal(prevOwnerBalance.toString(), ownerBalance.toString(), "recover failed");
    });
    it("5-2 should not revert contract address's token to owner", async () => {
      let afot = await AFOT.deployed();
      const contractAddress = afot.address;
      let prevOwnerBalance = await afot.balanceOf(owner);
      let amount = 1000000;
      await afot.transfer(contractAddress, amount, { from: owner });
      let contractBalance = await afot.balanceOf(contractAddress);
      assert.equal(amount, contractBalance.valueOf(), "transfer failed");
      try {
        await afot.recoverERC20(contractAddress, amount, { from: ordinary });
      } catch (e) {}
      let ownerBalance = await afot.balanceOf(owner);
      assert.notEqual(prevOwnerBalance.toString(), ownerBalance.toString(), "recover succeed");
    });
  });
});
