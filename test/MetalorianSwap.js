const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("MetalorianSwap", function () {

  async function deplyMetalorianSwap() {

		const USDTf = await ethers.getContractFactory("Tether");
		const USDT = await USDTf.deploy();

		const USDCf = await ethers.getContractFactory("USDCoin");
		const USDC = await USDCf.deploy();

    const MetalorianSwap = await ethers.getContractFactory("MetalorianSwap");
		const metaSwap = await MetalorianSwap.deploy(USDC.address, USDT.address);

    return { metaSwap, USDT, USDC };

  }

  describe('Constructor', () => {

    describe("functionalities", () => {

      it("Should set the addresses of the tokens 1 ans 2", async () => {

        const { metaSwap, USDT, USDC } = await loadFixture( deplyMetalorianSwap )

        const token1 = await metaSwap.token1()

        const token2 = await metaSwap.token2()

        expect( token1 == USDT.address )

        expect( token2 == USDC.address )

      })
    })
  })

});
