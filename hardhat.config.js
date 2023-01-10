require("dotenv").config()
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
		mainnet: {
			url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_MAINNET_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		goerli: {
			url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_GOERLI_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
    hardhat: {
      forking: {
        url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`
      }
    }
  },
	etherscan: {
		apiKey: {
			mainnet: `${process.env.ETHERSCAN_API_KEY}`,
			goerli: `${process.env.ETHERSCAN_API_KEY}`
    }
  }
};
