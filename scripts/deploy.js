const hre = require("hardhat");

async function main() {

  // const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
  // const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  // const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53"

  const USDTf = await ethers.getContractFactory("Tether");
  const USDT = await USDTf.deploy();
  await USDT.deployed()

  const USDCf = await ethers.getContractFactory("USDCoin");
  const USDC = await USDCf.deploy();
  await USDC.deployed()

  const MetalorianSwap = await ethers.getContractFactory("MetalorianSwap");
  const metalorianSwap = await MetalorianSwap.deploy( USDT.address, USDC.address );

  await metalorianSwap.deployed();

  console.log( `
  USDT Address: ${ USDT.address }
  USDC Address: ${ USDC.address }
  MetalorianSwap deployed to ${metalorianSwap.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
