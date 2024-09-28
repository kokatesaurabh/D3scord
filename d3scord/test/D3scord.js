const { expect } = require("chai")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe("D3scord", function () {
  let deployer, user
  let d3scord

  const NAME = "D3scord"
  const SYMBOL = "DC"

  beforeEach(async () => {
    // Setup accounts
    [deployer, user] = await ethers.getSigners()

    // Deploy contract
    const D3scord = await ethers.getContractFactory("D3scord")
    d3scord = await D3scord.deploy(NAME, SYMBOL)

    // Create a channel
    const transaction = await d3scord.connect(deployer).createChannel("general", tokens(1))
    await transaction.wait()
  })

  describe("Deployment", function () {
    it("Sets the name", async () => {
      const result = await d3scord.name()
      expect(result).to.equal(NAME)
    })

    it("Sets the symbol", async () => {
      const result = await d3scord.symbol()
      expect(result).to.equal(SYMBOL)
    })

    it("Sets the owner", async () => {
      const result = await d3scord.owner()
      expect(result).to.equal(deployer.address)
    })
  })

  describe("Creating Channels", () => {
    it('Returns total channels', async () => {
      const result = await d3scord.totalChannels()
      expect(result).to.be.equal(1)
    })

    it('Returns channel attributes', async () => {
      const channel = await d3scord.getChannel(1)
      expect(channel.id).to.be.equal(1)
      expect(channel.name).to.be.equal("general")
      expect(channel.cost).to.be.equal(tokens(1))
    })
  })

  describe("Joining Channels", () => {
    const ID = 1
    const AMOUNT = ethers.utils.parseUnits("1", 'ether')

    beforeEach(async () => {
      const transaction = await d3scord.connect(user).mint(ID, { value: AMOUNT })
      await transaction.wait()
    })

    it('Joins the user', async () => {
      const result = await d3scord.hasJoined(ID, user.address)
      expect(result).to.be.equal(true)
    })

    it('Increases total supply', async () => {
      const result = await d3scord.totalSupply()
      expect(result).to.be.equal(ID)
    })

    it('Updates the contract balance', async () => {
      const result = await ethers.provider.getBalance(d3scord.address)
      expect(result).to.be.equal(AMOUNT)
    })
  })

  describe("Withdrawing", () => {
    const ID = 1
    const AMOUNT = ethers.utils.parseUnits("10", 'ether')
    let balanceBefore

    beforeEach(async () => {
      balanceBefore = await ethers.provider.getBalance(deployer.address)

      let transaction = await d3scord.connect(user).mint(ID, { value: AMOUNT })
      await transaction.wait()

      transaction = await d3scord.connect(deployer).withdraw()
      await transaction.wait()
    })

    it('Updates the owner balance', async () => {
      const balanceAfter = await ethers.provider.getBalance(deployer.address)
      expect(balanceAfter).to.be.greaterThan(balanceBefore)
    })

    it('Updates the contract balance', async () => {
      const result = await ethers.provider.getBalance(d3scord.address)
      expect(result).to.equal(0)
    })
  })
})
