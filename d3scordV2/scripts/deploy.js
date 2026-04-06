const hre   = require("hardhat");
const fs    = require("fs");
const path  = require("path");

const eth = (n) => ethers.utils.parseUnits(n.toString(), "ether");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  D3scord — Deploying contracts");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deployer :", deployer.address);
  console.log("  Balance  :", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

  /* ── Deploy ── */
  const Factory  = await ethers.getContractFactory("D3scord");
  const contract = await Factory.deploy("D3scord", "D3C");
  await contract.deployed();
  console.log("\n  ✅ Contract :", contract.address);

  /* ── Seed channels ── */
  const CHANNELS = [
    { name: "general",       cost: eth(0),    desc: "Open to everyone – say hello!" },
    { name: "announcements", cost: eth(0),    desc: "Server news and updates"        },
    { name: "defi-talk",     cost: eth(0.05), desc: "DeFi strategies and alpha"      },
    { name: "nft-alpha",     cost: eth(0.1),  desc: "NFT drops and research"         },
    { name: "dev-lounge",    cost: eth(0.25), desc: "Smart contract developers only" },
  ];

  console.log("\n  📢 Creating channels…");
  for (const ch of CHANNELS) {
    const tx = await contract.createChannel(ch.name, ch.cost, ch.desc);
    await tx.wait();
    const label = ch.cost.isZero() ? "FREE" : `${ethers.utils.formatEther(ch.cost)} ETH`;
    console.log(`     #${ch.name.padEnd(16)} ${label}`);
  }

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;

  /* ── Write frontend/src/config.json ── */
  const feConfig = path.resolve(__dirname, "../frontend/src/config.json");
  let cfg = {};
  if (fs.existsSync(feConfig)) cfg = JSON.parse(fs.readFileSync(feConfig, "utf8"));
  cfg[chainId] = { D3scord: { address: contract.address } };
  fs.writeFileSync(feConfig, JSON.stringify(cfg, null, 2));
  console.log("\n  📝 frontend/src/config.json updated");

  /* ── Copy ABI to frontend/src/abis/ ── */
  const abiSrc = path.resolve(__dirname, "../artifacts/contracts/D3scord.sol/D3scord.json");
  const abiDst = path.resolve(__dirname, "../frontend/src/abis/D3scord.json");
  fs.mkdirSync(path.dirname(abiDst), { recursive: true });
  fs.copyFileSync(abiSrc, abiDst);
  console.log("  📋 ABI copied to frontend/src/abis/D3scord.json");

  /* ── Write server/contract.json ── */
  const srvCfg = path.resolve(__dirname, "../server/contract.json");
  fs.writeFileSync(srvCfg, JSON.stringify({ address: contract.address, chainId }, null, 2));
  console.log("  🔧 server/contract.json updated");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  ✨  Deploy complete!");
  console.log("  Next → Terminal 2 : npm run server");
  console.log("  Next → Terminal 3 : npm run client");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
