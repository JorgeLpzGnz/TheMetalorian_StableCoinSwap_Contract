require("dotenv").config()
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
	compilers: [
		{ version: "0.8.17" },
		{ version: "0.4.17" },
		{ version: "0.4.24" },
		{ version: "0.5.12" }
	]
  },
  networks: {
		mainnet: {
			url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
		goerli: {
			url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
			accounts: [`0x${process.env.PRIVATE_KEY}`],
		},
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`
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
