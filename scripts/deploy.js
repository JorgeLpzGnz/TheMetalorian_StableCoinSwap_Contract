const hre = require("hardhat");

async function main() {

  const MetalorianSwap = await hre.ethers.getContractFactory("MetalorianSwap");
  const metalorianSwap = await MetalorianSwap.deploy();

  await metalorianSwap.deployed();

  console.log( `MetalorianSwap deployed to ${metalorianSwap.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
