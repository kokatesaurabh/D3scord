const { expect } = require("chai");
const { ethers }  = require("hardhat");

const e = (n) => ethers.utils.parseUnits(n.toString(), "ether");

describe("D3scord", () => {
  let owner, user1, user2, user3, ct;

  beforeEach(async () => {
    [owner, user1, user2, user3] = await ethers.getSigners();
    const F = await ethers.getContractFactory("D3scord");
    ct = await F.deploy("D3scord", "D3C");
    await ct.connect(owner).createChannel("general",   e(0),    "free");
    await ct.connect(owner).createChannel("defi-talk", e(0.05), "paid");
    await ct.connect(owner).createChannel("dev-lounge", e(0.25),"expensive");
  });

  describe("Deployment", () => {
    it("correct name & symbol",  async () => { expect(await ct.name()).to.equal("D3scord"); });
    it("sets owner",             async () => { expect(await ct.owner()).to.equal(owner.address); });
    it("creates 3 channels",     async () => { expect(await ct.totalChannels()).to.equal(3); });
  });

  describe("Free channel", () => {
    it("joins without ETH",  async () => {
      await ct.connect(user1).mint(1, { value: 0 });
      expect(await ct.hasJoined(1, user1.address)).to.be.true;
    });
    it("mints NFT to user",  async () => {
      await ct.connect(user1).mint(1, { value: 0 });
      expect(await ct.ownerOf(1)).to.equal(user1.address);
    });
    it("increments totalSupply", async () => {
      await ct.connect(user1).mint(1, { value: 0 });
      expect(await ct.totalSupply()).to.equal(1);
    });
  });

  describe("Paid channel", () => {
    it("joins with correct ETH",   async () => {
      await ct.connect(user1).mint(2, { value: e(0.05) });
      expect(await ct.hasJoined(2, user1.address)).to.be.true;
    });
    it("accepts excess ETH",       async () => {
      await ct.connect(user1).mint(2, { value: e(1) });
      expect(await ct.hasJoined(2, user1.address)).to.be.true;
    });
    it("reverts insufficient ETH", async () => {
      await expect(ct.connect(user1).mint(2, { value: e(0.001) }))
        .to.be.revertedWith("Insufficient ETH");
    });
    it("reverts duplicate join",   async () => {
      await ct.connect(user1).mint(2, { value: e(0.05) });
      await expect(ct.connect(user1).mint(2, { value: e(0.05) }))
        .to.be.revertedWith("Already joined");
    });
    it("multiple users can join",  async () => {
      await ct.connect(user1).mint(2, { value: e(0.05) });
      await ct.connect(user2).mint(2, { value: e(0.05) });
      expect(await ct.totalSupply()).to.equal(2);
    });
    it("updates contract balance", async () => {
      await ct.connect(user1).mint(2, { value: e(0.05) });
      expect(await ethers.provider.getBalance(ct.address)).to.equal(e(0.05));
    });
  });

  describe("Withdraw", () => {
    it("owner can withdraw",        async () => {
      await ct.connect(user1).mint(3, { value: e(0.25) });
      const before = await ethers.provider.getBalance(owner.address);
      await (await ct.connect(owner).withdraw()).wait();
      expect(await ethers.provider.getBalance(owner.address)).to.be.gt(before);
    });
    it("contract balance → 0",     async () => {
      await ct.connect(user1).mint(3, { value: e(0.25) });
      await ct.connect(owner).withdraw();
      expect(await ethers.provider.getBalance(ct.address)).to.equal(0);
    });
    it("non-owner cannot withdraw", async () => {
      await expect(ct.connect(user1).withdraw()).to.be.revertedWith("Not owner");
    });
  });

  describe("Access control", () => {
    it("only owner creates channels", async () => {
      await expect(ct.connect(user1).createChannel("x", e(0), "y"))
        .to.be.revertedWith("Not owner");
    });
    it("reverts invalid channel id", async () => {
      await expect(ct.connect(user1).mint(99)).to.be.revertedWith("Invalid channel");
    });
  });
});
