const hre = require("hardhat");

async function main() {

  // const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
  // const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  // const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53"

  const testUSDT = "0x948D917067BEF88203B095EcDFb92573401Ce7CE"
  const testUSDC = "0xEC5b6c7973b67191c616bea8d2ABEaf934270896"
  const testBUSD = "0x48D153249EE2B08E6bB89cfE3923053d3130ba78"

  const MS_USDT_USDC_F = await ethers.getContractFactory("MetalorianSwap");
  const MS_USDT_USDC = await MS_USDT_USDC_F.deploy( testUSDT, testUSDC, "USDTUSDC_LP" );
  await MS_USDT_USDC.deployed();

  const MS_USDC_BUSD_F = await ethers.getContractFactory("MetalorianSwap");
  const MS_USDC_BUSD = await MS_USDC_BUSD_F.deploy( testUSDC, testBUSD, "USDCBUSD_LP" );
  await MS_USDC_BUSD.deployed();

  const MS_BUSD_USDT_F = await ethers.getContractFactory("MetalorianSwap");
  const MS_BUSD_USDT = await MS_BUSD_USDT_F.deploy( testBUSD, testUSDT, "BUSDUSDC_LP" );
  await MS_BUSD_USDT.deployed();

  console.log( `
  MetalorianSwap USDT / USDC ${MS_USDT_USDC.address}
  MetalorianSwap USDC / BUSD ${MS_USDC_BUSD.address}
  MetalorianSwap BUSD / USDT ${MS_BUSD_USDT.address}`);
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
