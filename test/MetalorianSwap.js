const {
	time,
	loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

async function mintTokens(token, account, qty, metaSwap) {

	const amount = ethers.utils.parseUnits(`${qty}`, 6)

	await token.connect(account).mint(amount)

	await token.connect(account).approve(metaSwap.address, amount)

}

async function getSwapEstimation( metaSwap, amount, tokenIn ) {

	let totalTokenIn, totalTokenOut

	if( tokenIn == "USDT"){

		totalTokenIn = await metaSwap.totalToken1()
		
		totalTokenOut = await metaSwap.totalToken2()

	} else {
	
		totalTokenIn = await metaSwap.totalToken2()
	
		totalTokenOut = await metaSwap.totalToken1()

	}
	
	return await metaSwap.estimateSwap( amount, totalTokenIn, totalTokenOut )

}

describe("MetalorianSwap", function () {

	async function deployMetalorianSwap() {

		const [ owner, otherAcount ] = await ethers.getSigners()

		const USDTf = await ethers.getContractFactory("Tether");
		const USDT = await USDTf.deploy();

		const USDCf = await ethers.getContractFactory("USDCoin");
		const USDC = await USDCf.deploy();

		const MetalorianSwap = await ethers.getContractFactory("MetalorianSwap");
		const metaSwap = await MetalorianSwap.deploy( USDT.address, USDC.address );

		const USDTSupply = await USDT.totalSupply()
		const USDCSupply = await USDC.totalSupply()

		await USDT.approve(metaSwap.address, USDTSupply)
		await USDC.approve(metaSwap.address, USDCSupply)

		return { metaSwap, USDT, USDC, owner, otherAcount };

	}

	describe('constructor', () => {

		describe("- functionalities", () => {

			it("1. Should set the addresses of the tokens 1 ans 2", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const token1 = await metaSwap.token1()

				const token2 = await metaSwap.token2()

				expect(token1 == USDT.address)

				expect(token2 == USDC.address)

			})

		})

	})

	describe('addLiquidity', () => {

		describe("- Errors", () => {

			it("1. should fail if genesis amount is not equal", async () => {
				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("120", 6)
				const amount2 = ethers.utils.parseUnits("100", 6)

				await expect(
					metaSwap.addLiquidity(amount1, amount2)
				).to.be.revertedWith("Error: Genesis Amounts must be the same")

			})

			it("2. should fail if new liquidity are not in the same value", async () => {
				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("120", 6)
				const amount2 = ethers.utils.parseUnits("120", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.addLiquidity(amount1, amount2.sub(2))
				).to.be.revertedWith("Error: equivalent value not provided")

			})

		})

		describe("- functionalities", () => {

			it( "1. Prove is adding new liquidity", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("120", 6)
				const amount2 = ethers.utils.parseUnits("120", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalToken1 = await metaSwap.totalToken1()
				const totalToken2 = await metaSwap.totalToken2()

				const USDTBalance = await USDT.balanceOf( metaSwap.address )
				const USDCBalance = await USDC.balanceOf( metaSwap.address )

				const k = await metaSwap.k()

				expect( totalToken1 ).to.be.equal( USDTBalance )
				expect( totalToken2 ).to.be.equal( USDCBalance )
				expect( k ).to.be.equal(totalToken1.mul(totalToken2))

			})

			it( "2. Prove is adding the shares", async () => {

				const { metaSwap, owner, otherAcount, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("500000000", 6)
				const amount2 = ethers.utils.parseUnits("500000000", 6)

				const amount3 = ethers.utils.parseUnits("50", 6)
				const amount4 = ethers.utils.parseUnits("50", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				const shares = await metaSwap.shares( owner.address )
				const totalShares = await metaSwap.totalShares()

				expect( shares ).to.be.equal( amount1 )
				expect( totalShares ).to.be.equal( shares )

				await mintTokens(USDT, otherAcount, 5000000, metaSwap)
				await mintTokens(USDC, otherAcount, 5000000, metaSwap)

				await metaSwap.connect(otherAcount).addLiquidity(amount3, amount4)
				const shares2 = await metaSwap.shares( otherAcount.address )
				const totalShares2 = await metaSwap.totalShares()

				expect( shares2 ).to.be.equal( amount3 )
				expect( totalShares2 ).to.be.equal( shares.add( shares2 ) )

			})

		})

	})

	describe('removeLiquidity', () => {

		describe("- Errors", () => {

			it("1. should fail if pool doesn't have founds", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits("120", 6)

				await expect(
					metaSwap.removeLiquidity( amount )
				).to.be.revertedWith("Error: contract has no founds")

			})

			it("2. should fail if amount is with zero value", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", 6)
				const amount2 = ethers.utils.parseUnits("120", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.removeLiquidity( 0 )
				).to.be.revertedWith("Error: Invalid Amount, value = 0")

			})

			it("3. should fail if user not have sufficent shares", async () => {

				const { metaSwap, otherAcount } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", 6)
				const amount2 = ethers.utils.parseUnits("120", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.connect(otherAcount).removeLiquidity( amount1 )
				).to.be.revertedWith("Error: your not an LP")

			})

			it("4. should fail if contract not have sufficent shares", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", 6)
				const amount2 = ethers.utils.parseUnits("120", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.removeLiquidity( amount1.add( amount2 ) )
				).to.be.revertedWith("Error: your not an LP")

			})

		})

		describe("- functionalities", () => {

			it( "1. Should remove liquidity", async () => {

				const { metaSwap, USDT, USDC, otherAcount } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("12000", 6)
				const amount2 = ethers.utils.parseUnits("12000", 6)

				await mintTokens( USDT, otherAcount, 12000, metaSwap )
				await mintTokens( USDC, otherAcount, 12000, metaSwap )

				await metaSwap.connect(otherAcount).addLiquidity(amount1, amount2)

				const zbUSDT = await USDT.balanceOf( otherAcount.address )
				const zbUSDC = await USDC.balanceOf( otherAcount.address )

				expect( zbUSDT ).to.be.equal( 0 )
				expect( zbUSDC ).to.be.equal( 0 )

				await metaSwap.connect(otherAcount).removeLiquidity( amount1 )

				const bUSDT = await USDT.balanceOf( otherAcount.address )
				const bUSDC = await USDC.balanceOf( otherAcount.address )

				expect( bUSDT ).to.be.equal( amount1 )
				expect( bUSDC ).to.be.equal( amount2 )

			})

			it( "2. Prove is burnig shares the shares", async () => {

				const { metaSwap, owner } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("12000", 6)
				const amount2 = ethers.utils.parseUnits("12000", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				const sharesBefore = await metaSwap.shares( owner.address )
				const tSharesBefore = await metaSwap.totalShares()

				expect( sharesBefore ).to.be.equal( tSharesBefore )
				expect( tSharesBefore ).to.be.equal( amount1 )

				await metaSwap.removeLiquidity( amount1 )

				const sharesAfter = await metaSwap.shares( owner.address )
				const tSharesAfter = await metaSwap.totalShares()

				expect( sharesAfter ).to.be.equal( tSharesAfter )
				expect( tSharesAfter ).to.be.equal( 0 )

			})

			it( "3. Should update the balances", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("12000", 6)
				const amount2 = ethers.utils.parseUnits("12000", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalT1Before = await metaSwap.totalToken1()
				const totalT2Before = await metaSwap.totalToken2()
				const kBefore = await metaSwap.k()

				const balanceT1Before = await USDT.balanceOf( metaSwap.address )
				const balanceT2Before = await USDC.balanceOf( metaSwap.address )

				expect( totalT1Before ).to.be.equal( balanceT1Before )
				expect( totalT2Before ).to.be.equal( balanceT2Before )
				expect( kBefore ).to.be.equal( balanceT1Before.mul(balanceT2Before))

				await metaSwap.removeLiquidity( amount1 )

				const totalT1After = await metaSwap.totalToken1()
				const totalT2After = await metaSwap.totalToken2()
				const kAfter = await metaSwap.k()

				const balanceT1After = await USDT.balanceOf( metaSwap.address )
				const balanceT2After = await USDC.balanceOf( metaSwap.address )

				expect( totalT1After ).to.be.equal( balanceT1After )
				expect( totalT2After ).to.be.equal( balanceT2After )
				expect( kAfter ).to.be.equal( balanceT1After.mul(balanceT2After))

			})

		})

	})

	describe('swap', () => {

		describe("- Errors", () => {

			it("1. should fail if pool has no founds", async () => {

				const { metaSwap, USDT } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('1', 6)

				await expect( 
					metaSwap.swap( USDT.address, amount )
				).to.be.revertedWith("Error: contract has no founds")

			})

			it("2. Should fail if passed addres is not valid", async () => {

				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('1', 6)

				const amount1 = ethers.utils.parseUnits("120", 6)
				const amount2 = ethers.utils.parseUnits("120", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( owner.address, amount )
				).to.be.revertedWith("Error: invalid token")

			})

			it("3. Should fail if passed amount with zero value", async () => {

				const { metaSwap, USDT } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('0', 6)

				const amount1 = ethers.utils.parseUnits("120", 6)
				const amount2 = ethers.utils.parseUnits("120", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( USDT.address, amount )
				).to.be.revertedWith("Swap Eror: Invalid input amount with value 0 ")

			})

			it("4. Should fail if price impact is more than the double", async () => {

				const { metaSwap, USDT } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('120', 6)

				const amount1 = ethers.utils.parseUnits("120", 6)
				const amount2 = ethers.utils.parseUnits("120", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( USDT.address, amount )
				).to.be.revertedWith("Swap Error: Price impact is more than 2x")

			})

		})

		describe("- functionalities", () => {

			it( "1. Make a Swap of token 1 for toke 2", async () => {

				const { metaSwap, USDT, USDC, otherAcount } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', 6)

				const amount1 = ethers.utils.parseUnits("50000000", 6)
				const amount2 = ethers.utils.parseUnits("50000000", 6)

				await mintTokens( USDT, otherAcount, 120, metaSwap )

				const bUSDTBefore = await USDT.balanceOf( otherAcount.address )
				const bUSDCBefore = await USDC.balanceOf( otherAcount.address )

				expect( bUSDTBefore ).to.be.equal( amount )
				expect( bUSDCBefore ).to.be.equal( 0 )

				await metaSwap.addLiquidity(amount1, amount2)

				const swapStimate = await getSwapEstimation( metaSwap, amount, "USDT" )

				await metaSwap.connect( otherAcount ).swap( USDT.address, amount )

				const bUSDTAfter = await USDT.balanceOf( otherAcount.address )
				const bUSDCAfter = await USDC.balanceOf( otherAcount.address )

				expect( bUSDTAfter ).to.be.equal( 0 )
				expect( bUSDCAfter ).to.be.equal( swapStimate )

			})

			it( "2. Make a Swap of token 2 for token 1", async () => {

				const { metaSwap, USDT, USDC, otherAcount } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', 6)

				const amount1 = ethers.utils.parseUnits("50000000", 6)
				const amount2 = ethers.utils.parseUnits("50000000", 6)

				await mintTokens( USDC, otherAcount, 120, metaSwap )

				const bUSDCBefore = await USDC.balanceOf( otherAcount.address )
				const bUSDTBefore = await USDT.balanceOf( otherAcount.address )

				expect( bUSDCBefore ).to.be.equal( amount )
				expect( bUSDTBefore ).to.be.equal( 0 )

				await metaSwap.addLiquidity(amount1, amount2)

				const swapStimate = await getSwapEstimation( metaSwap, amount, "USDC" )
				await metaSwap.connect( otherAcount ).swap( USDC.address, amount )

				const bUSDTAfter = await USDT.balanceOf( otherAcount.address )
				const bUSDCAfter = await USDC.balanceOf( otherAcount.address )

				expect( bUSDCAfter ).to.be.equal( 0 )
				expect( bUSDTAfter ).to.be.equal( swapStimate )

			})

			it( "3. updating balances", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', 6)

				const amount1 = ethers.utils.parseUnits("50000000", 6)
				const amount2 = ethers.utils.parseUnits("50000000", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalT1Before = await metaSwap.totalToken1()
				const totalT2Before = await metaSwap.totalToken2()

				const bUSDTBefore = await USDT.balanceOf( metaSwap.address )
				const bUSDCBefore = await USDC.balanceOf( metaSwap.address )

				expect( bUSDTBefore ).to.be.equal( totalT1Before )
				expect( bUSDCBefore ).to.be.equal( totalT2Before )

				const swapStimate = await getSwapEstimation( metaSwap, amount, "USDT" )
				await metaSwap.swap( USDT.address, amount )

				const totalT1After = await metaSwap.totalToken1()
				const totalT2After = await metaSwap.totalToken2()

				const bUSDTAfter = await USDT.balanceOf( metaSwap.address )
				const bUSDCAfter = await USDC.balanceOf( metaSwap.address )

				expect( bUSDTAfter ).to.be.equal( totalT1After )
				expect( bUSDCAfter ).to.be.equal( totalT2After )
				// x + dx
				expect( totalT1Before.add( amount ) ).to.be.equal( totalT1After )
				// y - dy
				expect( totalT2Before.sub( swapStimate ) ).to.be.equal( totalT2After )

			})

			// update ?

			it( "3. constant produnct", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', 6)

				const amount1 = ethers.utils.parseUnits("50000000", 6)
				const amount2 = ethers.utils.parseUnits("50000000", 6)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalT1Before = await metaSwap.totalToken1()
				const totalT2Before = await metaSwap.totalToken2()
				const kBefore = await metaSwap.k()

				expect( kBefore ).to.be.equal( totalT1Before.mul(totalT2Before) )
				await metaSwap.swap( USDT.address, amount )

				const totalT1After = await metaSwap.totalToken1()
				const totalT2After = await metaSwap.totalToken2()
				const kAfter = await metaSwap.k()

				expect( kAfter ).to.be.equal( totalT1After.mul(totalT2After))

			})

		})

	})

});
