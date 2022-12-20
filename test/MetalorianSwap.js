const {
	time,
	loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
	decimals,
    calculateDyPassingDx, 
    calculateReward, 
    mintTokens, 
    addRamdomLiquidity,
    removeRamdomLiquidity, 
    makeAletaoriesSwap, 
    getSwapEstimation, 
    proveRandomSwap
} = require("../utils/tools")

/****************************************************************************/
/***************************** tools *************************************/

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

	describe('estimateShares', () => {

		describe("- Errors", () => {

			it("1. Should fail if genesis amount isn't equal", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits( "120", decimals )

				const amount2 = ethers.utils.parseUnits( "123", decimals )

				await expect(
					metaSwap.estimateShares( amount1, amount2 )
				).to.be.revertedWith("Error: Genesis Amounts must be the same")

			})

			it("2. Should fail if amount has not equivalent value", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits( "120000000", decimals )

				const amount2 = ethers.utils.parseUnits( "120000000", decimals )

				await metaSwap.addLiquidity( amount1, amount2 )

				await makeAletaoriesSwap( metaSwap, 5, [ USDT, USDC ] )

				await expect(
					metaSwap.estimateShares( amount1, amount2 )
				).to.be.revertedWith("Error: equivalent value not provided")

			})

			it("3. Should fail if return zero value", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.estimateShares( 0, 0 )
				).to.be.revertedWith("Error: shares with zero value")

			})

		})

		describe("- functionalities", () => {

			it("1. Should return a shares amount", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits( "1200000", decimals )

				const amount2 = ethers.utils.parseUnits( "1200000", decimals )

				const shares = await metaSwap.estimateShares( amount1, amount2 )

				expect( shares ).to.be.greaterThan( 0 )

			})

			it("2. Should return a correct amount", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits( "1200000", decimals )

				const amount2 = ethers.utils.parseUnits( "1200000", decimals )

				const shares = await metaSwap.estimateShares( amount1, amount2 )

				expect( shares ).to.be.equal( amount1 )

			})

		})

	})

	describe('estimateWithdrawAmounts', () => {

		describe("- Errors", () => {

			it("1. should fail if pool is not Active", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const shares = ethers.utils.parseUnits("120", decimals)

				await expect(
					metaSwap.estimateWithdrawAmounts( shares )
				).to.be.revertedWith("Error: contract has no founds")

			})

			it("2. should fail if contract has not suficent shares", async () => {
				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.estimateWithdrawAmounts(amount1.add(100))
				).to.be.revertedWith("Error: insuficent shares")

			})

		})

		describe("- functionalities", () => {

			it( "1. Prove returnal value is always the correct", async () => {

				const { metaSwap, otherAcount, USDT, USDC } = await loadFixture( deployMetalorianSwap )

				// amounts owner to add new liquidity

				const amount1Owner = ethers.utils.parseUnits("120000", decimals)
				const amount2Owner = ethers.utils.parseUnits("120000", decimals)

				// amounts anothe account to estimate

				const amount1OthrAccount = ethers.utils.parseUnits("50000", decimals)
				const amount2OthrAccount = ethers.utils.parseUnits("50000", decimals)

				await metaSwap.addLiquidity(amount1Owner, amount2Owner)

				const [ amount1OutO, amount2OutO ] = await metaSwap.estimateWithdrawAmounts( amount1Owner )

				// the amounts of the owner must be equal in inactivity pool

				expect( amount1OutO ).to.be.equal( amount1Owner )
				expect( amount2OutO ).to.be.equal( amount2Owner )

				await mintTokens( USDT, otherAcount, amount1OthrAccount, metaSwap)
				await mintTokens( USDC, otherAcount, amount2OthrAccount, metaSwap)

				// make the same with another account

				await metaSwap.connect( otherAcount ).addLiquidity(amount1OthrAccount, amount2OthrAccount)
				
				const [ amount1OutOA, amount2OutOA ] = await metaSwap.connect( otherAcount ).estimateWithdrawAmounts( amount1OthrAccount )

				expect( amount1OutOA ).to.be.equal( amount1OthrAccount )
				expect( amount2OutOA ).to.be.equal( amount2OthrAccount )

				// replicate pool activity

				await makeAletaoriesSwap( metaSwap, 20, [ USDT, USDC ] )

				await addRamdomLiquidity( metaSwap, USDT, USDC )

				await removeRamdomLiquidity( metaSwap )

				await makeAletaoriesSwap( metaSwap, 10, [ USDT, USDC ] )

				await addRamdomLiquidity( metaSwap, USDT, USDC )

				const [ amount1OutOAfter, amount2OutOAfter ] = await metaSwap.estimateWithdrawAmounts( amount1Owner )

				// estimated value must be greater or equal to initial in an active pool

				expect( amount1OutOAfter.add(amount2OutOAfter)  ).to.be.greaterThanOrEqual( amount1Owner.add(amount2Owner))

			})

		})

	})

	describe('estimateSwap', () => {

		describe("- Errors", () => {

			it("1. Should fail if pass some cero value", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.estimateSwap( 0, 1, 1 )
				).to.be.revertedWith("Swap Eror: Invalid input amount with value 0 ")

				await expect(
					metaSwap.estimateSwap( 1, 0, 1 )
				).to.be.revertedWith("Swap Eror: Invalid input amount with value 0 ")

				await expect(
					metaSwap.estimateSwap( 1, 1, 0 )
				).to.be.revertedWith("Swap Eror: Invalid input amount with value 0 ")

			})

		})

		describe("- functionalities", () => {

			it("1. Should return the amount out", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits( "10", decimals )

				const total1 = ethers.utils.parseUnits( "1200000", decimals )

				const total2 = ethers.utils.parseUnits( "1200000", decimals )

				const amountOut = await metaSwap.estimateSwap(
					amount,
					total1,
					total2
				)

				expect( amountOut ).to.be.greaterThan( 0 )

			})

			it("2. Should return the correct value", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits( "10", decimals )

				const total1 = ethers.utils.parseUnits( "1200000", decimals )

				const total2 = ethers.utils.parseUnits( "1200000", decimals )

				const amountOut = await metaSwap.estimateSwap(
					amount,
					total1,
					total2
				)

				const estimation = total2.mul( 
					amount.mul(997).div( 1000 )
				).div( total1.add( 
					amount.mul(997).div( 1000 )) 
				)

				expect( amountOut ).to.be.equal( estimation )

			})

		})

	})

	describe('addLiquidity', () => {

		describe("- Errors", () => {

			it("1. should fail if genesis amount is not equal", async () => {
				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("100", decimals)

				await expect(
					metaSwap.addLiquidity(amount1, amount2)
				).to.be.revertedWith("Error: Genesis Amounts must be the same")

			})

			it("2. should fail if new liquidity are not in the same value", async () => {
				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.addLiquidity(amount1, amount2.sub(2))
				).to.be.revertedWith("Error: equivalent value not provided")

			})

			it("3. should fail if shares value is with zero value", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("0", decimals)
				const amount2 = ethers.utils.parseUnits("0", decimals)

				await expect(
					metaSwap.addLiquidity( amount1, amount2 )
				).to.be.revertedWith("Error: shares with zero value")

			})

		})

		describe("- functionalities", () => {

			it( "1. Prove is adding new liquidity", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

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

				const amount1 = ethers.utils.parseUnits("500000000", decimals)
				const amount2 = ethers.utils.parseUnits("500000000", decimals)

				const amount3 = ethers.utils.parseUnits("50", decimals)
				const amount4 = ethers.utils.parseUnits("50", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const shares = await metaSwap.balanceOf( owner.address )
				const totalShares = await metaSwap.totalSupply()

				expect( shares ).to.be.equal( amount1 )
				expect( totalShares ).to.be.equal( shares )

				await mintTokens(USDT, otherAcount, amount1, metaSwap)
				await mintTokens(USDC, otherAcount, amount2, metaSwap)

				await metaSwap.connect(otherAcount).addLiquidity(amount3, amount4)
				const shares2 = await metaSwap.balanceOf( otherAcount.address )
				const totalShares2 = await metaSwap.totalSupply()

				expect( shares2 ).to.be.equal( amount3 )
				expect( totalShares2 ).to.be.equal( shares.add( shares2 ) )

			})

		})

	})

	describe('removeLiquidity', () => {

		describe("- Errors", () => {

			it("1. should fail if pool doesn't have founds", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits("120", decimals)

				await expect(
					metaSwap.removeLiquidity( amount )
				).to.be.revertedWith("Error: contract has no founds")

			})

			it("2. should fail if amount is with zero value", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.removeLiquidity( 0 )
				).to.be.revertedWith("Error: Invalid Amount, value = 0")

			})

			it("3. should fail if user not have sufficent shares", async () => {

				const { metaSwap, otherAcount } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.connect(otherAcount).removeLiquidity( amount1 )
				).to.be.revertedWith("Error: your not an LP")

			})

			it("4. should fail if contract not have sufficent shares", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.removeLiquidity( amount1.add( amount2 ) )
				).to.be.revertedWith("Error: your not an LP")

			})

		})

		describe("- functionalities", () => {

			it( "1. Should remove liquidity", async () => {

				const { metaSwap, USDT, USDC, otherAcount } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("12000", decimals)
				const amount2 = ethers.utils.parseUnits("12000", decimals)

				await mintTokens( USDT, otherAcount, amount1, metaSwap )
				await mintTokens( USDC, otherAcount, amount2, metaSwap )

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

			it( "2. Prove is burnig the shares", async () => {

				const { metaSwap, owner } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("12000", decimals)
				const amount2 = ethers.utils.parseUnits("12000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const sharesBefore = await metaSwap.balanceOf( owner.address )
				const tSharesBefore = await metaSwap.totalSupply()

				expect( sharesBefore ).to.be.equal( tSharesBefore )
				expect( tSharesBefore ).to.be.equal( amount1 )

				await metaSwap.removeLiquidity( amount1 )

				const sharesAfter = await metaSwap.balanceOf( owner.address )
				const tSharesAfter = await metaSwap.totalSupply()

				expect( sharesAfter ).to.be.equal( tSharesAfter )
				expect( tSharesAfter ).to.be.equal( 0 )

			})

			it( "3. Should update the balances", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("12000", decimals)
				const amount2 = ethers.utils.parseUnits("12000", decimals)

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

				// pove the update balances match with contract USDT / USDC Balance

				expect( totalT1After ).to.be.equal( balanceT1After )
				expect( totalT2After ).to.be.equal( balanceT2After )
				expect( kAfter ).to.be.equal( balanceT1After.mul(balanceT2After))

				// those amounts must be cero

				expect( totalT1After ).to.be.equal( 0 )
				expect( totalT2After ).to.be.equal( 0 )
				expect( kAfter ).to.be.equal( 0)

			})

			it( "4. Prove withdraws over the time", async () => {

				const { metaSwap, owner, otherAcount, USDT, USDC } = await loadFixture( deployMetalorianSwap )

				// initial inversor

				const amount1 = ethers.utils.parseUnits("12000000", decimals)
				const amount2 = ethers.utils.parseUnits("12000000", decimals)

				// simulate a pool activity

				await metaSwap.addLiquidity(amount1, amount2)

				await addRamdomLiquidity( metaSwap, USDT, USDC)

				await makeAletaoriesSwap( metaSwap, 100, [ USDT, USDC ] )

				await removeRamdomLiquidity( metaSwap )

				await addRamdomLiquidity( metaSwap, USDT, USDC)

				await makeAletaoriesSwap( metaSwap, 50, [ USDT, USDC ] )

				await removeRamdomLiquidity( metaSwap )

				await makeAletaoriesSwap( metaSwap, 50, [ USDT, USDC ] )

				// last inversor

				const amountsAO = await calculateDyPassingDx( metaSwap, 12000000 )

				await mintTokens( USDT, otherAcount, amountsAO[0], metaSwap)
				await mintTokens( USDC, otherAcount, amountsAO[1], metaSwap)

				console.log( ethers.utils.formatUnits( amountsAO[0].add(amountsAO[1]), decimals ) )

				await metaSwap
				    .connect( otherAcount )
					.addLiquidity( amountsAO[0], amountsAO[1] )

				// shares balances

				const balanceOwner = await metaSwap.balanceOf( owner.address )
				const balanceOA = await metaSwap.balanceOf( otherAcount. address )

				// withdraw amounts

				const [ withdraw1, withdraw2 ] = await metaSwap.estimateWithdrawAmounts( balanceOwner )

				const [ withdraw1AO, withdraw2AO ] = await metaSwap.connect( otherAcount ).estimateWithdrawAmounts( balanceOA )

				// initial investor must have more than initial amount

				expect( 
					calculateReward( amount1.add( amount2 ) , withdraw1.add( withdraw2 ) ) 
				).to.be.greaterThan( 0 )

				// last investor must have the same quantity

				expect( 
					calculateReward( amountsAO[0].add( amountsAO[1] ) , withdraw1AO.add( withdraw2AO ) )  
				).to.be.equal( 0 )

			})

		})

	})

	describe('swap', () => {

		describe("- Errors", () => {

			it("1. should fail if pool has no founds", async () => {

				const { metaSwap, USDT } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('1', decimals)

				await expect( 
					metaSwap.swap( USDT.address, amount )
				).to.be.revertedWith("Error: contract has no founds")

			})

			it("2. Should fail if passed addres is not valid", async () => {

				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('1', decimals)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( owner.address, amount )
				).to.be.revertedWith("Error: invalid token")

			})

			it("3. Should fail if passed amount with zero value", async () => {

				const { metaSwap, USDT } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('0', decimals)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( USDT.address, amount )
				).to.be.revertedWith("Swap Eror: Invalid input amount with value 0 ")

			})

			// update

			it("4. Should fail if price impact is more than the double", async () => {

				const { metaSwap, USDT } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( USDT.address, amount )
				).to.be.revertedWith("Swap Error: Price impact is more than 2x")

			})

		})

		describe("- functionalities", () => {

			it( "1. Make a Swap of token 1 for toke 2", async () => {

				const { metaSwap, USDT, USDC, otherAcount } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await mintTokens( USDT, otherAcount, amount, metaSwap )

				const bUSDTBefore = await USDT.balanceOf( otherAcount.address )
				const bUSDCBefore = await USDC.balanceOf( otherAcount.address )

				// prove balances

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

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await mintTokens( USDC, otherAcount, amount, metaSwap )

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

			it( "3. updating balances swapping token 1 for token 2", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalT1Before = await metaSwap.totalToken1()
				const totalT2Before = await metaSwap.totalToken2()

				const bUSDTBefore = await USDT.balanceOf( metaSwap.address )
				const bUSDCBefore = await USDC.balanceOf( metaSwap.address )

				// check swap balances update

				expect( amount1 ).to.be.equal( totalT1Before )
				expect( amount2 ).to.be.equal( totalT2Before )
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

			it( "3. updating balances swapping token 2 for token 1", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalT1Before = await metaSwap.totalToken1()
				const totalT2Before = await metaSwap.totalToken2()

				const bUSDTBefore = await USDT.balanceOf( metaSwap.address )
				const bUSDCBefore = await USDC.balanceOf( metaSwap.address )

				// check swap balances update

				expect( amount1 ).to.be.equal( totalT1Before )
				expect( amount2 ).to.be.equal( totalT2Before )
				expect( bUSDTBefore ).to.be.equal( totalT1Before )
				expect( bUSDCBefore ).to.be.equal( totalT2Before )

				const swapStimate = await getSwapEstimation( metaSwap, amount, "USDC" )
				await metaSwap.swap( USDC.address, amount )

				const totalT1After = await metaSwap.totalToken1()
				const totalT2After = await metaSwap.totalToken2()

				const bUSDTAfter = await USDT.balanceOf( metaSwap.address )
				const bUSDCAfter = await USDC.balanceOf( metaSwap.address )

				expect( bUSDTAfter ).to.be.equal( totalT1After )
				expect( bUSDCAfter ).to.be.equal( totalT2After )
				// x - dx
				expect( totalT1Before.sub( swapStimate ) ).to.be.equal( totalT1After )
				// y + dy
				expect( totalT2Before.add( amount ) ).to.be.equal( totalT2After )

			})

			// update ?

			it( "4. constant produnct", async () => {

				const { metaSwap, USDT } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

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

			it( "5. Prove returnal value", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const prove = await proveRandomSwap( metaSwap, [ USDT, USDC ])

				expect( prove ).to.be.true

			})

		})

	})

	describe("Events", () => {

		describe("- Functionalities", () => {

			it("1. NewLiquidity", async () => {
				
				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits( "100000", decimals )
				const amount2 = ethers.utils.parseUnits( "100000", decimals )

				expect(
					await metaSwap.addLiquidity( amount1, amount2)
				).to.emit( owner.address, amount1, amount2 )
			})

			it("2. LiquidityWithdraw", async () => {
				
				const { metaSwap, owner } = await  loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits( "100000", decimals )
				const amount2 = ethers.utils.parseUnits( "100000", decimals )

				await metaSwap.addLiquidity( amount1, amount2)

				expect(
					await metaSwap.removeLiquidity( amount1 )
				).to.emit( owner.address, amount1, amount2 )
			
			})

			it("3. Swap", async () => {
				
				const { metaSwap, owner, USDT } = await  loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits( "10", decimals )

				const amount1 = ethers.utils.parseUnits( "100000", decimals )
				const amount2 = ethers.utils.parseUnits( "100000", decimals )

				await metaSwap.addLiquidity( amount1, amount2)

				const amountOut = amount2.mul( 
					amount.mul(997).div( 1000 )
				).div( amount1.add( 
					amount.mul(997).div( 1000 )) 
				)

				expect(
					await metaSwap.swap( USDT.address, amount )
				).to.emit( owner.address, amount, amountOut )

			})

		})

	})

});
