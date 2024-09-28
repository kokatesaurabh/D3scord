const hre = require("hardhat")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

async function main() {
  // Setup accounts & variables
  const [deployer] = await ethers.getSigners()
  const NAME = "D3scord" 
  const SYMBOL = "DC"

  // Deploy contract
  const D3scord = await ethers.getContractFactory("D3scord") 
  const d3scord = await D3scord.deploy(NAME, SYMBOL) 
  await d3scord.deployed()

  console.log(`Deployed D3scord Contract at: ${d3scord.address}\n`) 

  // Create 3 Channels
  const CHANNEL_NAMES = ["general", "intro", "jobs"]
  const COSTS = [tokens(1), tokens(0), tokens(0.25)]

  for (var i = 0; i < 3; i++) {
    const transaction = await d3scord.connect(deployer).createChannel(CHANNEL_NAMES[i], COSTS[i]) 
    await transaction.wait()

    console.log(`Created text channel #${CHANNEL_NAMES[i]}`)
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
