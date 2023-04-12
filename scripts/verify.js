const hre = require("hardhat");

// mainnet recipient

// const recipient = "0x43d903211aE9AFDbDa240e39FCaEB5dD7558e05B"

// testnet recipient

const recipient = "0x4057171680FA6f9A9E65707076c1b18eE078eBbA"

// mainnet contracts

// const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
// const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
// const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53"
// const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"

// Tests contracts

const USDT = "0x948D917067BEF88203B095EcDFb92573401Ce7CE"
const USDC = "0xEC5b6c7973b67191c616bea8d2ABEaf934270896"
const BUSD = "0x48D153249EE2B08E6bB89cfE3923053d3130ba78"
const DAI = "0xD7961411DD94Cf52d6d32DB3600a8D08c57495D8"

async function verifyContracts() {

    // Pool USDT - USDC 

    await hre.run( "verify:verify", {
        address: "0x08E6C5e4A544750Ec5b519f29D43eFc8f7D74239",
        constructorArguments: [
            USDT,
            USDC,
            "USDTUSDC_LP",
            recipient
        ]
    } ).catch((error) => console.error( error ) )

    // Pool USDC - BUSD

    await hre.run( "verify:verify", {
        address: "0x415BA640180f66199A88f586C6FE96779E57C97a",
        constructorArguments: [
            USDC, BUSD, "USDCBUSD_LP", recipient
        ]
    } ).catch((error) => console.error( error ) )

    // Pool BUSD - USDT

    await hre.run( "verify:verify", {
        address: "0x62522590dc9dC005C96a42b96B4112Fa949EEdF5",
        constructorArguments: [
            BUSD, USDT, "BUSDUSDT_LP", recipient
        ]
    } ).catch((error) => console.error( error ) )

    // Pool USDT - DAI

    await hre.run( "verify:verify", {
        address: "0x6f30b7cfDB762AC09714e8196410e40b3247F52F",
        constructorArguments: [
            USDT, DAI, "USDTDAI_LP", recipient
        ]
    } ).catch((error) => console.error( error ) )

}

verifyContracts()