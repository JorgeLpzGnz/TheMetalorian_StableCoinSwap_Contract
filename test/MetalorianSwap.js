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
    addRandomLiquidity,
    removeRandomLiquidity, 
    makeRandomSwap, 
    getSwapEstimation, 
    proveRandomSwap
} = require("../utils/tools")
const tokensABI = require("../utils/tokensABI.json")

/****************************************************************************/
/***************************** tools *************************************/

describe("MetalorianSwap", function () {

	async function deployMetalorianSwap() {

		const [ owner, otherAccount ] = await ethers.getSigners()

		// const USDTf = await ethers.getContractFactory("Tether");
		// const USDT = await USDTf.deploy();

		// const USDCf = await ethers.getContractFactory("USDCoin");
		// const USDC = await USDCf.deploy();

		// const BUSDf = await ethers.getContractFactory("BinanceUSD");
		// const BUSD = await BUSDf.deploy();

		const USDT = new ethers.Contract(
			"0x948D917067BEF88203B095EcDFb92573401Ce7CE",
			tokensABI,
			owner
		)

		const USDC = new ethers.Contract(
			"0xEC5b6c7973b67191c616bea8d2ABEaf934270896",
			tokensABI,
			owner
		)

		const BUSD = new ethers.Contract(
			"0x48D153249EE2B08E6bB89cfE3923053d3130ba78",
			tokensABI,
			owner
		)

		const MetalorianSwap = await ethers.getContractFactory("MetalorianSwap");
		const metaSwap = await MetalorianSwap.deploy( USDT.address, USDC.address, "USDT_USDC_LP", owner.address );

		const MS_BUSD_USDT_F = await ethers.getContractFactory("MetalorianSwap");
		const MS_BUSD_USDT = await MS_BUSD_USDT_F.deploy(  BUSD.address, USDT.address, "BUSD_USDT_LP", owner.address );

		const USDTSupply = await USDT.totalSupply()
		const USDCSupply = await USDC.totalSupply()
		const BUSDSupply = await BUSD.totalSupply()

		await USDT.mint( USDCSupply )
		await USDC.mint( USDCSupply )
		await BUSD.mint( USDCSupply )

		await USDT.approve( metaSwap.address, USDTSupply )
		await USDC.approve( metaSwap.address, USDCSupply )
		await BUSD.approve( MS_BUSD_USDT.address, BUSDSupply )
		await USDT.approve( MS_BUSD_USDT.address, USDTSupply )

		const protocolFee = await metaSwap.protocolFee()
		const tradeFee = await metaSwap.tradeFee()

		return { metaSwap, USDT, USDC, BUSD, owner, otherAccount, MS_BUSD_USDT, protocolFee, tradeFee };

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

	describe('getPoolInfo', () => {

		describe("- functionalities", () => {

			it("1. Should return the current info", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				// prove initial info

				const currInfo = await metaSwap.getPoolInfo()

				expect( currInfo.token1 ).to.be.equal( USDT.address )
				expect( currInfo.token2 ).to.be.equal( USDC.address )
				expect( currInfo.totalToken1 ).to.be.equal( 0 )
				expect( currInfo.totalToken2 ).to.be.equal( 0 )
				expect( currInfo.totalSupply ).to.be.equal( 0 )
				expect( currInfo.tradeFee ).to.be.equal( 30 )
				expect( currInfo.protocolFee ).to.be.equal( 20 )
				expect( currInfo.maxTradePercentage ).to.be.equal( 1000 )

				const amount1 = ethers.utils.parseUnits("1000", decimals )
				const amount2 = ethers.utils.parseUnits("1000", decimals )

				await metaSwap.addLiquidity( amount1, amount2 )

				// prove before pool activity

				const newInfo = await metaSwap.getPoolInfo()

				expect( newInfo.token1 ).to.be.equal( USDT.address )
				expect( newInfo.token2 ).to.be.equal( USDC.address )
				expect( newInfo.totalToken1 ).to.be.equal( amount1 )
				expect( newInfo.totalToken2 ).to.be.equal( amount2 )
				expect( newInfo.totalSupply ).to.be.equal( amount1 )
				expect( newInfo.tradeFee ).to.be.equal( 30 )
				expect( newInfo.protocolFee ).to.be.equal( 20 )
				expect( newInfo.maxTradePercentage ).to.be.equal( 1000 )

			})

		})

	})

	describe('setProtocolFee', () => {

		describe("- Errors", () => {

			it("1. Should fail if not owner want to change", async () => {

				const { metaSwap, otherAccount } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.connect( otherAccount ).setProtocolFee( 10 )
				).to.be.reverted

			})

		})

		describe("- functionalities", () => {

			it("1. Should set the new protocol fee", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const initialProtocolFee = await metaSwap.protocolFee()

				expect( initialProtocolFee ).to.be.equal( 20 )

				await metaSwap.setProtocolFee( 10 )

				const newFee = await metaSwap.protocolFee()

				expect( newFee ).to.be.equal( 10 )

			})

		})

	})

	describe('setTradeFee', () => {

		describe("- Errors", () => {

			it("1. Should fail if not owner want to change", async () => {

				const { metaSwap, otherAccount } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.connect( otherAccount ).setTradeFee( 970 )
				).to.be.reverted

			})

		})

		describe("- functionalities", () => {

			it("1. Should set the new trade fee", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const initialFee = await metaSwap.tradeFee()

				expect( initialFee ).to.be.equal( 30 )

				await metaSwap.setTradeFee( 25 )

				const newFee = await metaSwap.tradeFee()

				expect( newFee ).to.be.equal( 25 )

			})

		})

	})

	describe('setFeeRecipient', () => {

		describe("- Errors", () => {

			it("1. Should fail if not owner want to change", async () => {

				const { metaSwap, otherAccount } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.connect( otherAccount ).setFeeRecipient( otherAccount.address )
				).to.be.reverted

			})

			it("1. Should fail if try to set the same than current", async () => {

				const { metaSwap, owner } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.setFeeRecipient( owner.address )
				).to.be.revertedWith("New Recipient can be the same than current")

			})

		})

		describe("- functionalities", () => {

			it("1. Should set the new trade fee", async () => {

				const { metaSwap, owner, otherAccount } = await loadFixture(deployMetalorianSwap)

				const currentRecipient = await metaSwap.feeRecipient()

				expect( currentRecipient ).to.be.equal( owner.address )

				await metaSwap.setFeeRecipient( otherAccount.address )

				expect( await metaSwap.feeRecipient() ).to.be.equal( otherAccount.address )

			})

		})

	})
	
	describe('setMaxTradePercentage', () => {

		describe("- Errors", () => {

			it("1. Should fail if not owner want to change", async () => {

				const { metaSwap, otherAccount } = await loadFixture(deployMetalorianSwap)

				await expect(
					metaSwap.connect( otherAccount ).setMaxTradePercentage( 1000 )
				).to.be.reverted

			})

		})

		describe("- functionalities", () => {

			it("1. Should set the new maximum trade percentage", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const initialPercentage = await metaSwap.maxTradePercentage()

				expect( initialPercentage ).to.be.equal( 1000 )

				await metaSwap.setMaxTradePercentage( 2000 )

				const newPercentage = await metaSwap.maxTradePercentage()

				expect( newPercentage ).to.be.equal( 2000 )

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

				await makeRandomSwap( metaSwap, 5, [ USDT, USDC ] )

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

	describe('estimateWithdrawalAmounts', () => {

		describe("- Errors", () => {

			it("1. should fail if pool is not Active", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const shares = ethers.utils.parseUnits("120", decimals)

				await expect(
					metaSwap.estimateWithdrawalAmounts( shares )
				).to.be.revertedWith("Error: contract has no funds")

			})

			it("2. should fail if contract has not sufficient shares", async () => {
				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.estimateWithdrawalAmounts(amount1.add(100))
				).to.be.revertedWith("Error: insufficient pool balance")

			})

		})

		describe("- functionalities", () => {

			it( "1. Prove returned value is always the correct", async () => {

				const { metaSwap, otherAccount, USDT, USDC } = await loadFixture( deployMetalorianSwap )

				// amounts owner to add new liquidity

				const amount1Owner = ethers.utils.parseUnits("120000", decimals)
				const amount2Owner = ethers.utils.parseUnits("120000", decimals)

				// amounts another account to estimate

				const amount1OtherAccount = ethers.utils.parseUnits("50000", decimals)
				const amount2OtherAccount = ethers.utils.parseUnits("50000", decimals)

				await metaSwap.addLiquidity(amount1Owner, amount2Owner)

				const [ amount1OutO, amount2OutO ] = await metaSwap.estimateWithdrawalAmounts( amount1Owner )

				// the amounts of the owner must be equal in inactivity pool

				expect( amount1OutO ).to.be.equal( amount1Owner )
				expect( amount2OutO ).to.be.equal( amount2Owner )

				await mintTokens( USDT, otherAccount, amount1OtherAccount, metaSwap)
				await mintTokens( USDC, otherAccount, amount2OtherAccount, metaSwap)

				// make the same with another account

				await metaSwap.connect( otherAccount ).addLiquidity(amount1OtherAccount, amount2OtherAccount)
				
				const [ amount1OutOA, amount2OutOA ] = await metaSwap.connect( otherAccount ).estimateWithdrawalAmounts( amount1OtherAccount )

				expect( amount1OutOA ).to.be.equal( amount1OtherAccount )
				expect( amount2OutOA ).to.be.equal( amount2OtherAccount )

				// replicate pool activity

				await makeRandomSwap( metaSwap, 20, [ USDT, USDC ] )

				await addRandomLiquidity( metaSwap, USDT, USDC )

				await removeRandomLiquidity( metaSwap )

				await makeRandomSwap( metaSwap, 10, [ USDT, USDC ] )

				await addRandomLiquidity( metaSwap, USDT, USDC )

				const [ amount1OutOAfter, amount2OutOAfter ] = await metaSwap.estimateWithdrawalAmounts( amount1Owner )

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
				).to.be.revertedWith("Swap Error: Input amount with 0 value not valid")

				await expect(
					metaSwap.estimateSwap( 1, 0, 1 )
				).to.be.revertedWith("Swap Error: Input amount with 0 value not valid")

				await expect(
					metaSwap.estimateSwap( 1, 1, 0 )
				).to.be.revertedWith("Swap Error: Input amount with 0 value not valid")

			})

		})

		describe("- functionalities", () => {

			it("1. Should return the amount out", async () => {

				const { metaSwap } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits( "10", decimals )

				const total1 = ethers.utils.parseUnits( "1200000", decimals )

				const total2 = ethers.utils.parseUnits( "1200000", decimals )

				const [ ,amountOut, ] = await metaSwap.estimateSwap(
					amount,
					total1,
					total2
				)

				expect( amountOut ).to.be.greaterThan( 0 )

			})

			it("2. Should return the correct value", async () => {

				const { metaSwap, protocolFee, tradeFee } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits( "10", decimals )

				const total1 = ethers.utils.parseUnits( "1200000", decimals )

				const total2 = ethers.utils.parseUnits( "1200000", decimals )

				const [ ,amountOut, ] = await metaSwap.estimateSwap(
					amount,
					total1,
					total2
				)

				const estimation = total2.mul( 
					amount.mul( 10000 - ( protocolFee + tradeFee ) ).div( 10000 )
				).div( total1.add( 
					amount.mul( 10000 - ( protocolFee + tradeFee ) ).div( 10000 )) 
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

				// const k = await metaSwap.k()

				expect( totalToken1 ).to.be.equal( USDTBalance )
				expect( totalToken2 ).to.be.equal( USDCBalance )
				// expect( k ).to.be.equal(totalToken1.mul(totalToken2))

			})

			it( "2. Prove is adding new liquidity in BUSD and USDT", async () => {

				const { MS_BUSD_USDT, BUSD, USDT } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await MS_BUSD_USDT.addLiquidity(amount1, amount2)

				const totalToken1 = await MS_BUSD_USDT.totalToken1()
				const totalToken2 = await MS_BUSD_USDT.totalToken2()

				const BUSDBalance = await BUSD.balanceOf( MS_BUSD_USDT.address )
				const USDTBalance = await USDT.balanceOf( MS_BUSD_USDT.address )

				// const k = await MS_BUSD_USDT.k()

				expect( totalToken1 ).to.be.equal( USDTBalance )
				expect( totalToken2 ).to.be.equal( BUSDBalance.div( 10e11 ) )
				// expect( k ).to.be.equal(totalToken1.mul(totalToken2))

			})

			it( "3. Prove is adding the shares", async () => {

				const { metaSwap, owner, otherAccount, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("500000000", decimals)
				const amount2 = ethers.utils.parseUnits("500000000", decimals)

				const amount3 = ethers.utils.parseUnits("50", decimals)
				const amount4 = ethers.utils.parseUnits("50", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const shares = await metaSwap.balanceOf( owner.address )
				const totalShares = await metaSwap.totalSupply()

				expect( shares ).to.be.equal( amount1 )
				expect( totalShares ).to.be.equal( shares )

				await mintTokens(USDT, otherAccount, amount1, metaSwap)
				await mintTokens(USDC, otherAccount, amount2, metaSwap)

				await metaSwap.connect(otherAccount).addLiquidity(amount3, amount4)
				const shares2 = await metaSwap.balanceOf( otherAccount.address )
				const totalShares2 = await metaSwap.totalSupply()

				expect( shares2 ).to.be.equal( amount3 )
				expect( totalShares2 ).to.be.equal( shares.add( shares2 ) )

			})

		})

	})

	describe('withdrawLiquidity', () => {

		describe("- Errors", () => {

			it("1. should fail if pool doesn't have funds", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits("120", decimals)

				await expect(
					metaSwap.withdrawLiquidity( amount )
				).to.be.revertedWith("Error: contract has no funds")

			})

			it("2. should fail if amount is with zero value", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.withdrawLiquidity( 0 )
				).to.be.revertedWith("Error: Invalid Amount, value = 0")

			})

			it("3. should fail if user not have sufficient shares", async () => {

				const { metaSwap, otherAccount } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.connect(otherAccount).withdrawLiquidity( amount1 )
				).to.be.revertedWith("Error: Insufficient LP balance")

			})

			it("4. should fail if contract not have sufficient shares", async () => {

				const { metaSwap } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect(
					metaSwap.withdrawLiquidity( amount1.add( amount2 ) )
				).to.be.revertedWith("Error: Insufficient LP balance")

			})

		})

		describe("- functionalities", () => {

			it( "1. Should remove liquidity", async () => {

				const { metaSwap, USDT, USDC, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("12000", decimals)
				const amount2 = ethers.utils.parseUnits("12000", decimals)

				await mintTokens( USDT, otherAccount, amount1, metaSwap )
				await mintTokens( USDC, otherAccount, amount2, metaSwap )

				await metaSwap.connect(otherAccount).addLiquidity(amount1, amount2)

				const zbUSDT = await USDT.balanceOf( otherAccount.address )
				const zbUSDC = await USDC.balanceOf( otherAccount.address )

				expect( zbUSDT ).to.be.equal( 0 )
				expect( zbUSDC ).to.be.equal( 0 )

				await metaSwap.connect(otherAccount).withdrawLiquidity( amount1 )

				const bUSDT = await USDT.balanceOf( otherAccount.address )
				const bUSDC = await USDC.balanceOf( otherAccount.address )

				expect( bUSDT ).to.be.equal( amount1 )
				expect( bUSDC ).to.be.equal( amount2 )

			})

			it( "2. Should remove liquidity of BUSD and USDT", async () => {

				const { MS_BUSD_USDT, USDT, BUSD, otherAccount } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("12000", decimals)
				const amount2 = ethers.utils.parseUnits("12000", decimals)

				await mintTokens( BUSD, otherAccount, amount1.mul( 10e11 ), MS_BUSD_USDT )
				await mintTokens( USDT, otherAccount, amount2, MS_BUSD_USDT )

				await MS_BUSD_USDT.connect(otherAccount).addLiquidity(amount1, amount2)

				const zbUSDT = await USDT.balanceOf( otherAccount.address )
				const zbBUSD = await BUSD.balanceOf( otherAccount.address )

				expect( zbBUSD ).to.be.equal( 0 )
				expect( zbUSDT ).to.be.equal( 0 )

				await MS_BUSD_USDT.connect(otherAccount).withdrawLiquidity( amount1 )

				const bUSDT = await USDT.balanceOf( otherAccount.address )
				const bBUSD = await BUSD.balanceOf( otherAccount.address )

				expect( bBUSD ).to.be.equal( amount1.mul( 10e11 ) )
				expect( bUSDT ).to.be.equal( amount2 )

			})

			it( "3. Prove is burning the shares", async () => {

				const { metaSwap, owner } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("12000", decimals)
				const amount2 = ethers.utils.parseUnits("12000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const sharesBefore = await metaSwap.balanceOf( owner.address )
				const tSharesBefore = await metaSwap.totalSupply()

				expect( sharesBefore ).to.be.equal( tSharesBefore )
				expect( tSharesBefore ).to.be.equal( amount1 )

				await metaSwap.withdrawLiquidity( amount1 )

				const sharesAfter = await metaSwap.balanceOf( owner.address )
				const tSharesAfter = await metaSwap.totalSupply()

				expect( sharesAfter ).to.be.equal( tSharesAfter )
				expect( tSharesAfter ).to.be.equal( 0 )

			})

			it( "4. Should update the balances", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("12000", decimals)
				const amount2 = ethers.utils.parseUnits("12000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const totalT1Before = await metaSwap.totalToken1()
				const totalT2Before = await metaSwap.totalToken2()
				// const kBefore = await metaSwap.k()

				const balanceT1Before = await USDT.balanceOf( metaSwap.address )
				const balanceT2Before = await USDC.balanceOf( metaSwap.address )

				expect( totalT1Before ).to.be.equal( balanceT1Before )
				expect( totalT2Before ).to.be.equal( balanceT2Before )
				// expect( kBefore ).to.be.equal( balanceT1Before.mul(balanceT2Before))

				await metaSwap.withdrawLiquidity( amount1 )

				const totalT1After = await metaSwap.totalToken1()
				const totalT2After = await metaSwap.totalToken2()
				// const kAfter = await metaSwap.k()

				const balanceT1After = await USDT.balanceOf( metaSwap.address )
				const balanceT2After = await USDC.balanceOf( metaSwap.address )

				// prove the update balances match with contract USDT / USDC Balance

				expect( totalT1After ).to.be.equal( balanceT1After )
				expect( totalT2After ).to.be.equal( balanceT2After )
				// expect( kAfter ).to.be.equal( balanceT1After.mul(balanceT2After))

				// those amounts must be cero

				expect( totalT1After ).to.be.equal( 0 )
				expect( totalT2After ).to.be.equal( 0 )
				// expect( kAfter ).to.be.equal( 0)

			})

			it( "5. Prove withdraws over the time", async () => {

				const { metaSwap, owner, otherAccount, USDT, USDC } = await loadFixture( deployMetalorianSwap )

				// initial investor

				const amount1 = ethers.utils.parseUnits("12000000", decimals)
				const amount2 = ethers.utils.parseUnits("12000000", decimals)

				// simulate a pool activity

				await metaSwap.addLiquidity(amount1, amount2)

				await addRandomLiquidity( metaSwap, USDT, USDC)

				await makeRandomSwap( metaSwap, 100, [ USDT, USDC ] )

				await removeRandomLiquidity( metaSwap )

				await addRandomLiquidity( metaSwap, USDT, USDC)

				await makeRandomSwap( metaSwap, 50, [ USDT, USDC ] )

				await removeRandomLiquidity( metaSwap )

				await makeRandomSwap( metaSwap, 50, [ USDT, USDC ] )

				// last investor

				const amountsAO = await calculateDyPassingDx( metaSwap, 12000000 )

				await mintTokens( USDT, otherAccount, amountsAO[0], metaSwap)
				await mintTokens( USDC, otherAccount, amountsAO[1], metaSwap)

				await metaSwap
				    .connect( otherAccount )
					.addLiquidity( amountsAO[0], amountsAO[1] )

				// shares balances

				const balanceOwner = await metaSwap.balanceOf( owner.address )
				const balanceOA = await metaSwap.balanceOf( otherAccount. address )

				// withdraw amounts

				const [ withdraw1, withdraw2 ] = await metaSwap.estimateWithdrawalAmounts( balanceOwner )

				const [ withdraw1AO, withdraw2AO ] = await metaSwap.connect( otherAccount ).estimateWithdrawalAmounts( balanceOA )

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

			it("1. should fail if pool has no funds", async () => {

				const { metaSwap, USDT } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('1', decimals)

				await expect( 
					metaSwap.swap( USDT.address, amount )
				).to.be.revertedWith("Error: contract has no funds")

			})

			it("2. Should fail if passed address is not valid", async () => {

				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('1', decimals)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( owner.address, amount )
				).to.be.revertedWith("Trade Error: invalid token")

			})

			it("3. Should fail if passed amount with zero value", async () => {

				const { metaSwap, USDT } = await loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits('0', decimals)

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				await expect( 
					metaSwap.swap( USDT.address, amount )
				).to.be.revertedWith("Swap Error: Input amount with 0 value not valid")

			})

			// update

			it("4. Should fail if price impact is more than trade limit", async () => {

				const { metaSwap, USDT } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits("120", decimals)
				const amount2 = ethers.utils.parseUnits("120", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const maxTrade = await metaSwap.maxTrade(amount2)

				const amountIn = amount1.mul( maxTrade ).div( amount2.sub( maxTrade  ))

				await expect( 
					metaSwap.swap( USDT.address, amountIn.add( 1e6 ) )
				).to.be.revertedWith("Swap Error: output value is greater than the limit")

			})

		})

		describe("- functionalities", () => {

			it( "1. Make a Swap of token 1 for toke 2", async () => {

				const { metaSwap, USDT, USDC, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await mintTokens( USDT, otherAccount, amount, metaSwap )

				const bUSDTBefore = await USDT.balanceOf( otherAccount.address )
				const bUSDCBefore = await USDC.balanceOf( otherAccount.address )

				// prove balances

				expect( bUSDTBefore ).to.be.equal( amount )
				expect( bUSDCBefore ).to.be.equal( 0 )

				await metaSwap.addLiquidity(amount1, amount2)

				const [ , swapEstimate, ] = await getSwapEstimation( metaSwap, amount, "USDT" )

				await metaSwap.connect( otherAccount ).swap( USDT.address, amount )

				const bUSDTAfter = await USDT.balanceOf( otherAccount.address )
				const bUSDCAfter = await USDC.balanceOf( otherAccount.address )

				expect( bUSDTAfter ).to.be.equal( 0 )
				expect( bUSDCAfter ).to.be.equal( swapEstimate )

			})

			it( "2. Make a Swap of token 2 for token 1", async () => {

				const { metaSwap, USDT, USDC, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await mintTokens( USDC, otherAccount, amount, metaSwap )

				const bUSDCBefore = await USDC.balanceOf( otherAccount.address )
				const bUSDTBefore = await USDT.balanceOf( otherAccount.address )

				expect( bUSDCBefore ).to.be.equal( amount )
				expect( bUSDTBefore ).to.be.equal( 0 )

				await metaSwap.addLiquidity(amount1, amount2)

				const [ , swapEstimate, ] = await getSwapEstimation( metaSwap, amount, "USDC" )
				await metaSwap.connect( otherAccount ).swap( USDC.address, amount )

				const bUSDTAfter = await USDT.balanceOf( otherAccount.address )
				const bUSDCAfter = await USDC.balanceOf( otherAccount.address )

				expect( bUSDCAfter ).to.be.equal( 0 )
				expect( bUSDTAfter ).to.be.equal( swapEstimate )

			})

			it( "3. Make a Swap of BUSD for toke USDT", async () => {

				const { MS_BUSD_USDT, USDT, BUSD, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await mintTokens( BUSD, otherAccount, amount.mul( 1e12 ), MS_BUSD_USDT )

				const bUSDTBefore = await USDT.balanceOf( otherAccount.address )
				const bBUSDBefore = await BUSD.balanceOf( otherAccount.address )

				// prove balances

				expect( bBUSDBefore ).to.be.equal( amount.mul( 1e12 ) )
				expect( bUSDTBefore ).to.be.equal( 0 )

				await MS_BUSD_USDT.addLiquidity(amount1, amount2)

				const [ , swapEstimate, ] = await getSwapEstimation( MS_BUSD_USDT, amount, "USDT" )

				await MS_BUSD_USDT.connect( otherAccount ).swap( BUSD.address, amount )

				const bBUSDAfter = await BUSD.balanceOf( otherAccount.address )
				const bUSDTAfter = await USDT.balanceOf( otherAccount.address )

				expect( bBUSDAfter ).to.be.equal( 0 )
				expect( bUSDTAfter ).to.be.equal( swapEstimate )

			})

			it( "4. Make a Swap of token USDT for token BUSD", async () => {

				const { MS_BUSD_USDT, USDT, BUSD, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits('120', decimals)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await mintTokens( USDT, otherAccount, amount, MS_BUSD_USDT )

				const bBUSDBefore = await BUSD.balanceOf( otherAccount.address )
				const bUSDTBefore = await USDT.balanceOf( otherAccount.address )

				expect( bUSDTBefore ).to.be.equal( amount )
				expect( bBUSDBefore ).to.be.equal( 0 )

				await MS_BUSD_USDT.addLiquidity(amount1, amount2)

				const [ ,swapEstimate, ] = await getSwapEstimation( MS_BUSD_USDT, amount, "USDC" )
				await MS_BUSD_USDT.connect( otherAccount ).swap( USDT.address, amount )

				const bUSDTAfter = await USDT.balanceOf( otherAccount.address )
				const bBUSDAfter = await BUSD.balanceOf( otherAccount.address )

				expect( bBUSDAfter ).to.be.equal( swapEstimate.mul( 1e12 ) )
				expect( bUSDTAfter ).to.be.equal( 0 )

			})

			it( "5. updating balances swapping token 1 for token 2", async () => {

				const { metaSwap, USDT, USDC, protocolFee } = await loadFixture(deployMetalorianSwap)

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

				const [ ,swapEstimate ] = await getSwapEstimation( metaSwap, amount, "USDT" )
				await metaSwap.swap( USDT.address, amount )

				const totalT1After = await metaSwap.totalToken1()
				const totalT2After = await metaSwap.totalToken2()

				const bUSDTAfter = await USDT.balanceOf( metaSwap.address )
				const bUSDCAfter = await USDC.balanceOf( metaSwap.address )

				expect( bUSDTAfter ).to.be.equal( totalT1After )
				expect( bUSDCAfter ).to.be.equal( totalT2After )
				// x + dx
				expect( totalT1Before.add( amount.mul( 10000 - protocolFee ).div( 10000 ) ) ).to.be.equal( totalT1After )
				// y - dy
				expect( totalT2Before.sub( swapEstimate ) ).to.be.equal( totalT2After )

			})

			it( "6. updating balances swapping token 2 for token 1", async () => {

				const { metaSwap, USDT, USDC, protocolFee } = await loadFixture( deployMetalorianSwap )

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

				const [ ,swapEstimate ] = await getSwapEstimation( metaSwap, amount, "USDC" )
				await metaSwap.swap( USDC.address, amount )

				const totalT1After = await metaSwap.totalToken1()
				const totalT2After = await metaSwap.totalToken2()

				const bUSDTAfter = await USDT.balanceOf( metaSwap.address )
				const bUSDCAfter = await USDC.balanceOf( metaSwap.address )

				expect( bUSDTAfter ).to.be.equal( totalT1After )
				expect( bUSDCAfter ).to.be.equal( totalT2After )
				// x - dx
				expect( totalT1Before.sub( swapEstimate ) ).to.be.equal( totalT1After )
				// y + dy
				expect( totalT2Before.add( amount.mul( 10000 - protocolFee ).div( 10000 ) ) ).to.be.equal( totalT2After )

			})

			// update ?

			// it( "7. constant product", async () => {

			// 	const { metaSwap, USDT } = await loadFixture(deployMetalorianSwap)

			// 	const amount = ethers.utils.parseUnits('120', decimals)

			// 	const amount1 = ethers.utils.parseUnits("50000000", decimals)
			// 	const amount2 = ethers.utils.parseUnits("50000000", decimals)

			// 	await metaSwap.addLiquidity(amount1, amount2)

			// 	const totalT1Before = await metaSwap.totalToken1()
			// 	const totalT2Before = await metaSwap.totalToken2()
			// 	const kBefore = await metaSwap.k()

			// 	expect( kBefore ).to.be.equal( totalT1Before.mul(totalT2Before) )
			// 	await metaSwap.swap( USDT.address, amount )

			// 	const totalT1After = await metaSwap.totalToken1()
			// 	const totalT2After = await metaSwap.totalToken2()
			// 	const kAfter = await metaSwap.k()

			// 	expect( kAfter ).to.be.equal( totalT1After.mul(totalT2After))

			// })

			it( "8. Prove return value", async () => {

				const { metaSwap, USDT, USDC } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const prove = await proveRandomSwap( metaSwap, [ USDT, USDC ])

				expect( prove ).to.be.true

			})

			it( "9. Prove return value in BUSD USDC", async () => {

				const { MS_BUSD_USDT, USDT, BUSD } = await loadFixture(deployMetalorianSwap)

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await MS_BUSD_USDT.addLiquidity(amount1, amount2)

				const prove2 = await proveRandomSwap( MS_BUSD_USDT, [ USDT, BUSD ])

				expect( prove2 ).to.be.true

			})

			it( "10. Prove owner is receiving the swap rewards", async () => {

				const { metaSwap, USDT, owner, protocolFee, otherAccount } = await loadFixture(deployMetalorianSwap)

				const amount = ethers.utils.parseUnits("1000", decimals)

				const fee = amount.mul( protocolFee ).div( 10000 )

				const amount1 = ethers.utils.parseUnits("50000000", decimals)
				const amount2 = ethers.utils.parseUnits("50000000", decimals)

				await metaSwap.addLiquidity(amount1, amount2)

				const balanceBefore = await USDT.balanceOf( owner.address )

				await mintTokens( USDT, otherAccount, amount, metaSwap)

				await metaSwap.connect( otherAccount ).swap( USDT.address, amount)

				const balanceAfter = await USDT.balanceOf( owner.address )

				expect( balanceBefore.add( fee ) ).to.be.equal( balanceAfter )

			})

		})

	})

	describe("Events", () => {

		describe("- Functionalities", () => {

			it("1. NewLiquidity", async () => {
				
				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits( "100000", decimals )
				const amount2 = ethers.utils.parseUnits( "100000", decimals )

				await expect(
					metaSwap.addLiquidity( amount1, amount2)
				).to.emit( metaSwap, "NewLiquidity" ).withArgs( owner.address, amount1, amount2, amount1, amount1 )
				
			})

			it("2. LiquidityWithdrawal", async () => {
				
				const { metaSwap, owner } = await  loadFixture( deployMetalorianSwap )

				const amount1 = ethers.utils.parseUnits( "100000", decimals )
				const amount2 = ethers.utils.parseUnits( "100000", decimals )

				await metaSwap.addLiquidity( amount1, amount2)

				await expect(
					metaSwap.withdrawLiquidity( amount1 )
				).to.emit( metaSwap, "LiquidityWithdrawal" ).withArgs( owner.address, amount1, amount2, amount1, 0 )
			
			})

			it("3. Swap", async () => {
				
				const { metaSwap, owner, USDT, protocolFee, tradeFee  } = await  loadFixture( deployMetalorianSwap )

				const amount = ethers.utils.parseUnits( "10", decimals )

				const amount1 = ethers.utils.parseUnits( "100000", decimals )
				const amount2 = ethers.utils.parseUnits( "100000", decimals )

				await metaSwap.addLiquidity( amount1, amount2)

				const amountOut = amount2.mul( 
					amount.mul( 10000 - ( protocolFee + tradeFee ) ).div( 10000 )
				).div( amount1.add( 
					amount.mul( 10000 - ( protocolFee + tradeFee )).div( 10000 )) 
				)

				const creatorFee = amount.mul( protocolFee ).div( 10000 )

				await expect(
					metaSwap.swap( USDT.address, amount )
				).to.emit( metaSwap, "Swap" ).withArgs( owner.address, creatorFee, amount.sub( creatorFee ), amountOut )

			})

			it("4. NewTradeFee", async () => {
				
				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				await expect(
					metaSwap.setTradeFee( 800 )
				).to.emit( metaSwap, "NewTradeFee" ).withArgs( owner.address, 800 )
			})

			it("5. NewMaxTradePercentage", async () => {
				
				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				await expect(
					metaSwap.setMaxTradePercentage( 100 )
				).to.emit( metaSwap, "NewMaxTradePercentage" ).withArgs( owner.address, 100 )
			})

			it("6. NewProtocolFee", async () => {
				
				const { metaSwap, owner } = await loadFixture( deployMetalorianSwap )

				await expect(
					metaSwap.setProtocolFee( 10 )
				).to.emit( metaSwap, "NewProtocolFee" ).withArgs( owner.address, 10 )
			})

			it("7. NewFeeRecipient", async () => {
				
				const { metaSwap, otherAccount } = await loadFixture( deployMetalorianSwap )

				await expect(
					metaSwap.setFeeRecipient( otherAccount.address )
				).to.emit( metaSwap, "NewFeeRecipient" ).withArgs( otherAccount.address )
			})

		})

	})

});
